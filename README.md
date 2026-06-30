# Almo Shop Project

An end-to-end e-commerce system that automatically syncs product data from AWS S3 into a database and serves it to an AI-powered storefront.

## What This Project Does

Every day, a product data file lands in AWS S3. This system reads that file, parses it, stores it in MySQL, and exposes it through a REST API. A React storefront then fetches those products and uses AI to generate polished names, taglines, and descriptions for each one.

```
AWS S3 (almo.txt)
      |
      v
almo-pipeline (FastAPI backend)
      |
      v
MySQL database
      |
      v
ai-shop (React frontend) --> Groq AI generates product copy
      |
      v
Customer-facing storefront
```

## Project Structure

```
almo-shop-project/
|-- almo-pipeline/     Backend: FastAPI, MySQL, AWS S3 sync
`-- ai-shop/            Frontend: React storefront with AI product generation
```

## almo-pipeline (Backend)

**Stack:** Python, FastAPI, SQLAlchemy, MySQL, boto3, APScheduler

**What it does:**
- Pulls a pipe-delimited product file from an S3 bucket
- Parses each row into a structured product record (id, name, price, inventory, upc)
- Saves the data to MySQL, keeping the database in sync with the source file (updates, inserts, and removes rows no longer present)
- Runs the sync automatically every day via a background scheduler
- Exposes REST endpoints to sync, read, update, and delete products

**Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | /api/products/sync | Pulls the latest file from S3 and syncs the database |
| GET    | /api/products/ | Returns all products |
| GET    | /api/products/{id} | Returns a single product |
| PUT    | /api/products/{id} | Updates a product |
| DELETE | /api/products/{id} | Deletes a product |

**Run it:**
```bash
cd almo-pipeline
source venv/bin/activate
uvicorn main:app --reload
```
API docs available at `http://127.0.0.1:8000/docs`

## ai-shop (Frontend)

**Stack:** React, Groq API (llama-3.3-70b-versatile)

**What it does:**
- Fetches the live product catalog from almo-pipeline's API
- Uses Groq AI to generate product names, taglines, descriptions, and pricing copy
- Supports image upload, a cart, and a product detail view
- Presents everything as a polished storefront experience

**Run it:**
```bash
cd ai-shop
npm install
npm start
```
Opens at `http://localhost:3000`

## Running the Full Project

Open two terminal tabs:

**Terminal 1 — Backend**
```bash
cd almo-pipeline
source venv/bin/activate
uvicorn main:app --reload
```

**Terminal 2 — Frontend**
```bash
cd ai-shop
npm start
```

With both running, ai-shop pulls live product data from almo-pipeline and enriches it with AI-generated content in real time.

## Environment Variables

Both projects use `.env` files for secrets (database credentials, AWS keys, Groq API key). These are excluded from version control via `.gitignore` and must be configured locally before running either project.

**almo-pipeline/.env**
```
DATABASE_URL=mysql+pymysql://root:yourpassword@localhost/almodb
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=eu-north-1
S3_BUCKET_NAME=your_bucket_name
S3_FILE_KEY=almo.txt
```

**ai-shop/.env.local**
```
REACT_APP_GROQ_API_KEY=your_groq_key
```

## Testing

```bash
cd almo-pipeline
pytest tests/test_products.py -v
```

7 automated tests cover the file parser and all API endpoints.

## Design Notes

- The sync logic treats the S3 file as the single source of truth: on every sync, the database is updated to exactly match the current valid contents of the file, including removing products no longer present.
- Malformed rows in the source file are skipped individually with a logged warning rather than failing the entire sync.
- The backend and frontend are decoupled through a REST API and CORS, so either side can be modified or redeployed independently.
