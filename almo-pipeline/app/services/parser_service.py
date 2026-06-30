def parse_file(file_content: str):
    products = []
    lines = file_content.strip().split("\n")

    if len(lines) < 2:
        raise ValueError("File has no data rows")

    for i, line in enumerate(lines[1:], start=2):
        line = line.strip()
        if not line:
            continue  # skip empty lines
        parts = line.split("|")
        if len(parts) != 5:
            print(f"Skipping row {i} — wrong number of fields: {line}")
            continue
        try:
            product = {
                "id": int(parts[0]),
                "name": parts[1].strip(),
                "price": float(parts[2].strip()),
                "inventory": int(parts[3].strip()),
                "upc": parts[4].strip()
            }
            products.append(product)
        except ValueError as e:
            print(f"Skipping row {i} — invalid data: {line} — {e}")
            continue

    if not products:
        raise ValueError("No valid products found in file")

    return products