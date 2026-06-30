from fastapi import APIRouter
from app.services import product_service

router = APIRouter()

@router.post("/sync")
def sync_products():
    try:
        count = product_service.sync_from_file()
        return {"message": f"{count} products synced"}
    except FileNotFoundError as e:
        return {"error": str(e)}, 404
    except ValueError as e:
        return {"error": str(e)}, 400
    except Exception as e:
        return {"error": f"Something went wrong: {str(e)}"}

@router.get("/")
def get_all_products():
    try:
        products = product_service.get_all()
        return [
            {"id": p.id, "name": p.name, "price": p.price,
             "inventory": p.inventory, "upc": p.upc}
            for p in products
        ]
    except Exception as e:
        return {"error": f"Could not fetch products: {str(e)}"}

@router.get("/{product_id}")
def get_product(product_id: int):
    try:
        product = product_service.get_by_id(product_id)
        if not product:
            return {"error": "Product not found"}
        return {"id": product.id, "name": product.name,
                "price": product.price, "inventory": product.inventory,
                "upc": product.upc}
    except Exception as e:
        return {"error": f"Could not fetch product: {str(e)}"}

@router.put("/{product_id}")
def update_product(product_id: int, data: dict):
    try:
        product = product_service.update(product_id, data)
        if not product:
            return {"error": "Product not found"}
        return product
    except Exception as e:
        return {"error": f"Could not update product: {str(e)}"}
    
@router.delete("/{product_id}")
def delete_product(product_id: int):
    try:
        result = product_service.delete(product_id)
        if result:
            return {"message": "Product deleted"}
        return {"error": "Product not found"}
    except Exception as e:
        return {"error": f"Could not delete product: {str(e)}"}