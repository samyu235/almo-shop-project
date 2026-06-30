from app.services.s3_service import fetch_file
from app.services.parser_service import parse_file
from app.models.product import Product
from app.db.database import SessionLocal

def save_products(products):
    db = SessionLocal()
    try:
        valid_ids = [p["id"] for p in products]

        for p in products:
            product = Product(
                id=p["id"],
                name=p["name"],
                price=p["price"],
                inventory=p["inventory"],
                upc=p["upc"]
            )
            db.merge(product)

        # Delete any product not present in today's valid file data
        if valid_ids:
            db.query(Product).filter(~Product.id.in_(valid_ids)).delete(synchronize_session=False)
        else:
            db.query(Product).delete()

        db.commit()
        return len(products)
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

def get_all():
    db = SessionLocal()
    try:
        return db.query(Product).all()
    finally:
        db.close()

def get_by_id(product_id):
    db = SessionLocal()
    try:
        return db.query(Product).filter(Product.id == product_id).first()
    finally:
        db.close()

def delete(product_id):
    db = SessionLocal()
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if product:
            db.delete(product)
            db.commit()
            return True
        return False
    finally:
        db.close()

def sync_from_file():
    print("Scheduler fired! Starting sync...")
    raw_text = fetch_file()
    products = parse_file(raw_text)
    count = save_products(products)
    print(f"Sync complete — {count} products saved!")
    return count

def update(product_id, data):
    db = SessionLocal()
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            return None
        if "name" in data:
            product.name = data["name"]
        if "price" in data:
            product.price = data["price"]
        if "inventory" in data:
            product.inventory = data["inventory"]
        if "upc" in data:
            product.upc = data["upc"]
        db.commit()
        db.refresh(product)
        return {
            "id": product.id,
            "name": product.name,
            "price": product.price,
            "inventory": product.inventory,
            "upc": product.upc
        }
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()