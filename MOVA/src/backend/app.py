from flask import Flask, request, jsonify
from flask_cors import CORS
import boto3
import os
import time
import json
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

app = Flask(__name__)
CORS(app)

# AWS configuration
AWS_REGION = os.getenv("AWS_REGION", "ca-central-1")
S3_BUCKET = os.getenv("S3_BUCKET")

# Allowed image formats
ALLOWED_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
}

# Maximum image size: 5 MB
MAX_IMAGE_SIZE = 5 * 1024 * 1024

# Check that the S3 bucket is configured
if not S3_BUCKET:
    raise ValueError("S3_BUCKET is missing from your .env file")

# Connect to AWS S3
s3 = boto3.client(
    "s3",
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=AWS_REGION
)


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "Flask image gallery backend is running!"
    }), 200



@app.route("/upload-image", methods=["POST"])
def upload_image():
    try:

        # Check if image exists
        if "image" not in request.files:
            return jsonify({
                "error": "No image file provided"
            }), 400

        file = request.files["image"]

        if not file.filename:
            return jsonify({
                "error": "No image selected"
            }), 400

        # Check image format
        content_type = file.mimetype

        if content_type not in ALLOWED_TYPES:
            return jsonify({
                "error": "Unsupported image format. Use JPG, PNG, or WEBP."
            }), 400

        # Check image size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)

        if file_size > MAX_IMAGE_SIZE:
            return jsonify({
                "error": "Image must be smaller than 5 MB"
            }), 400

        if file_size == 0:
            return jsonify({
                "error": "The uploaded image is empty"
            }), 400

        # Get title and description
        title = request.form.get("title", "Untitled")
        description = request.form.get("description", "")

        # Generate unique filename
        timestamp = int(time.time())
        image_id = f"{timestamp}_{os.urandom(4).hex()}"

        extension = ALLOWED_TYPES[content_type]

        image_key = f"images/{image_id}.{extension}"
        metadata_key = f"images/{image_id}.json"

        # Upload image to S3
        s3.upload_fileobj(
            file,
            S3_BUCKET,
            image_key,
            ExtraArgs={
                "ContentType": content_type
            }
        )

        # Create metadata
        metadata = {
            "title": title,
            "description": description,
            "image_key": image_key,
            "uploaded_at": timestamp
        }

        # Upload metadata JSON to S3
        s3.put_object(
            Bucket=S3_BUCKET,
            Key=metadata_key,
            Body=json.dumps(metadata).encode("utf-8"),
            ContentType="application/json"
        )

        # Generate temporary viewing URL
        url = s3.generate_presigned_url(
            ClientMethod="get_object",
            Params={
                "Bucket": S3_BUCKET,
                "Key": image_key
            },
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
    try:

        images = []

        # List all objects in the images folder
        paginator = s3.get_paginator("list_objects_v2")

        pages = paginator.paginate(
            Bucket=S3_BUCKET,
            Prefix="images/"
        )

        for page in pages:

            items = page.get("Contents", [])

            # Only process JSON metadata files
            json_files = [
                item for item in items
                if item["Key"].endswith(".json")
            ]

            for json_file in json_files:

                # Retrieve metadata
                obj = s3.get_object(
                    Bucket=S3_BUCKET,
                    Key=json_file["Key"]
                )

                metadata = json.loads(
                    obj["Body"].read().decode("utf-8")
                )

                # Generate temporary image URL
                image_url = s3.generate_presigned_url(
                    ClientMethod="get_object",
                    Params={
                        "Bucket": S3_BUCKET,
                        "Key": metadata["image_key"]
                    },
                    ExpiresIn=3600
                )

                images.append({
                    "title": metadata.get("title", "Untitled"),
                    "description": metadata.get("description", ""),
                    "url": image_url,
                    "uploaded_at": metadata.get("uploaded_at", 0)
                })

        # Sort newest images first
        images.sort(
            key=lambda x: x["uploaded_at"],
            reverse=True
        )

        return jsonify(images), 200

    except Exception as e:
        print("Error fetching images:", e)

        return jsonify({
            "error": "Could not retrieve images",
            "details": str(e)
        }), 500


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )