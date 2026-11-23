from flask import Flask, request, jsonify
from flask_cors import CORS
import boto3
import os
import time
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types
from biometrics import biometrics_bp, start_reader 

# Load environment variables from .env
load_dotenv()

app = Flask(__name__)
CORS(app)
app.register_blueprint(biometrics_bp)

AWS_REGION = os.getenv("AWS_REGION", "ca-central-1")
S3_BUCKET = os.getenv("S3_BUCKET")

ALLOWED_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
}

MAX_IMAGE_SIZE = 5 * 1024 * 1024

if not S3_BUCKET:
    raise ValueError("S3_BUCKET is missing from your .env file")

s3 = boto3.client(
    "s3",
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=AWS_REGION
)

# Connect to Gemini AI
ai_client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY"),
    http_options=types.HttpOptions(timeout=10000),  # 8 seconds in milliseconds
)


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "Flask image gallery backend is running!"
    }), 200


@app.route("/upload-image", methods=["POST"])
def upload_image():
    try:
        if "image" not in request.files:
            return jsonify({"error": "No image file provided"}), 400

        file = request.files["image"]

        if not file.filename:
            return jsonify({"error": "No image selected"}), 400

        content_type = file.mimetype

        if content_type not in ALLOWED_TYPES:
            return jsonify({
                "error": "Unsupported image format. Use JPG, PNG, or WEBP."
            }), 400

        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)

        if file_size > MAX_IMAGE_SIZE:
            return jsonify({"error": "Image must be smaller than 5 MB"}), 400

        if file_size == 0:
            return jsonify({"error": "The uploaded image is empty"}), 400

        title = request.form.get("title", "").strip() or "Untitled"
        description = request.form.get("description", "")
        username = request.form.get("username", "").strip()[:50] or "Anonymous"

      
        timestamp = int(time.time())
        image_id = f"{timestamp}_{os.urandom(4).hex()}"

        extension = ALLOWED_TYPES[content_type]

        image_key = f"images/{image_id}.{extension}"
        metadata_key = f"images/{image_id}.json"

        s3.upload_fileobj(
            file,
            S3_BUCKET,
            image_key,
            ExtraArgs={"ContentType": content_type}
        )

        metadata = {
            "title": title,
            "description": description,
            "username": username,
            "image_key": image_key,
            "uploaded_at": timestamp
        }

        s3.put_object(
            Bucket=S3_BUCKET,
            Key=metadata_key,
            Body=json.dumps(metadata).encode("utf-8"),
            ContentType="application/json"
        )

        url = s3.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": S3_BUCKET, "Key": image_key},
            ExpiresIn=3600
        )

        return jsonify({
            "message": "Image uploaded successfully",
            "url": url
        }), 200

    except Exception as e:
        print("Upload error:", e)
        return jsonify({
            "error": "Image upload failed",
            "details": str(e)
        }), 500


@app.route("/get-images", methods=["GET"])
def get_images():
    """
    Paginated gallery endpoint (newest first).

    Query params:
      limit  - how many images to return (default 12, max 50)
      offset - how many images to skip (default 0)

    Response:
      {
        "images": [...],
        "next_offset": 12,
        "has_more": true
      }
    """
    try:
        limit = min(max(request.args.get("limit", 12, type=int), 1), 50)
        offset = max(request.args.get("offset", 0, type=int), 0)

        metadata_keys = []
        paginator = s3.get_paginator("list_objects_v2")

        for page in paginator.paginate(Bucket=S3_BUCKET, Prefix="images/"):
            for item in page.get("Contents", []):
                if item["Key"].endswith(".json"):
                    metadata_keys.append(item["Key"])

        metadata_keys.sort(reverse=True)

        total = len(metadata_keys)
        page_keys = metadata_keys[offset:offset + limit]

        images = []

        for key in page_keys:
            try:
                obj = s3.get_object(Bucket=S3_BUCKET, Key=key)
                metadata = json.loads(obj["Body"].read().decode("utf-8"))

                image_url = s3.generate_presigned_url(
                    ClientMethod="get_object",
                    Params={"Bucket": S3_BUCKET, "Key": metadata["image_key"]},
                    ExpiresIn=3600
                )

                images.append({
                    "image_key": metadata["image_key"],
                    "title": metadata.get("title", "Untitled"),
                    "description": metadata.get("description", ""),
                    "username": metadata.get("username"),
                    "url": image_url,
                    "uploaded_at": metadata.get("uploaded_at", 0)
                })
            except Exception as item_error:
                print(f"Skipping {key}:", item_error)

        next_offset = offset + len(page_keys)

        return jsonify({
            "images": images,
            "next_offset": next_offset,
            "has_more": next_offset < total
        }), 200

    except Exception as e:
        print("Error fetching images:", e)
        return jsonify({
            "error": "Could not retrieve images",
            "details": str(e)
        }), 500


@app.route("/api/chat", methods=["POST"])
def ai_chat():
    data = request.get_json()
    user_message = data.get("message", "")

    if not user_message:
        return jsonify({"reply": "Please enter a message."}), 400

    for model_name in ["gemini-3.5-flash-lite", "gemini-3.8-flash"]:
        try:
            response = ai_client.models.generate_content(
                model=model_name,
                contents=user_message,
                config=types.GenerateContentConfig(
                    system_instruction="You are MOVA AI, a friendly, helpful assistant for the MOVA photo-sharing community. Keep answers clear and concise (2-4 sentences unless asked for more). If asked about any features do not make up any; the features that we have include a page where you can upload workout progress pictures, a page where you can view other people's progress pictures, and finally a chat where they can communicate with the community (as well as this AI chat).",
                    max_output_tokens=200,
                ),
            )
            return jsonify({"reply": response.text}), 200
        except Exception as e:
            print(f"Model {model_name} failed:", e)

    return jsonify({"reply": "MOVA AI is busy right now—please try again in a moment!"}), 503

if __name__ == "__main__":
    start_reader()  
    app.run(host="127.0.0.1", port=5000, debug=True, use_reloader=False)