import boto3
import os
from dotenv import load_dotenv

load_dotenv()

def fetch_file():
    try:
        s3 = boto3.client(
            "s3",
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            region_name=os.getenv("AWS_REGION")
        )
        bucket = os.getenv("S3_BUCKET_NAME")
        key = os.getenv("S3_FILE_KEY")

        obj = s3.get_object(Bucket=bucket, Key=key)
        content = obj["Body"].read().decode("utf-8")

        if not content.strip():
            raise ValueError("File is empty")

        return content

    except s3.exceptions.NoSuchKey:
        raise FileNotFoundError(f"File '{key}' not found in bucket '{bucket}'")
    except Exception as e:
        raise Exception(f"Error reading file from S3: {str(e)}")