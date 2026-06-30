import { useState, useEffect } from "react";
import "./App.css";

const CATEGORY_IMAGES = {
  "Electronics": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400",
  "Clothing": "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=400",
  "Home & Kitchen": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400",
  "Sports": "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400",
  "Beauty": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400",
  "Books": "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400",
  "Toys": "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400",
  "Furniture": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400",
};

function getBackendHash(product) {
  return `${product.name}|${product.price}|${product.inventory}|${product.upc}`;
}

async function enhanceProductWithGroq(backendProduct) {
  const apiKey = process.env.REACT_APP_GROQ_KEY;
  const prompt = `You are an expert e-commerce product naming specialist in India.

Given this raw product data from a supplier:
- Name: ${backendProduct.name}
- Price: ₹${backendProduct.price_inr}
${backendProduct.modalNotes ? `- Extra details: ${backendProduct.modalNotes}
` : ""}

Generate a compelling product listing using only the product spec data above.
Do not invent specs, features, or attributes that are not present in the source data.
Ignore inventory and UPC values completely. Do not mention, infer, or base the description on inventory or UPC.
Reply ONLY with raw JSON — no markdown, no backticks, no explanation. Use exactly this format:
{"ai_name":"catchy product name 4-6 words","description":"2-3 sentence marketing description highlighting key benefits"}

Make the name catchy and marketable for Indian customers.`;

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      })
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error("Groq API error: " + err);
  }

  const data = await response.json();
  const rawText = data.choices[0].message.content;
  const match = rawText.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found in response: " + rawText);

  return JSON.parse(match[0]);
}

export default function App() {
  const [error, setError]           = useState("");
  const [products, setProducts]     = useState([]);
  const [tab, setTab]               = useState("review");
  const [hydrated, setHydrated]     = useState(false);
  const [selected, setSelected]     = useState(null);
  const [quantity, setQuantity]     = useState(1);
  const [cart, setCart]             = useState([]);
  const [cartOpen, setCartOpen]     = useState(false);
  const [addedMsg, setAddedMsg]     = useState(false);

  // Modal enhancement state
  const [modalImgPreview, setModalImgPreview] = useState(null);
  const [modalLoading, setModalLoading]       = useState(false);
  const [modalEnhanced, setModalEnhanced]     = useState(null);
  const [modalNotes, setModalNotes]           = useState("");
  const [modalError, setModalError]           = useState("");


  useEffect(() => {
    async function loadData() {
      try {
        const savedCart = localStorage.getItem("shopmind-cart");
        if (savedCart) setCart(JSON.parse(savedCart));

        const response = await fetch("http://127.0.0.1:8000/api/products/");
        if (!response.ok) {
          throw new Error(`Backend responded with status ${response.status}`);
        }
        const backendProducts = await response.json();
        if (!Array.isArray(backendProducts)) {
          throw new Error("Unexpected backend response format");
        }

        const mappedProducts = backendProducts.map(product => {
          const enhancement = JSON.parse(localStorage.getItem(`product-enhancement-${product.id}`) || "null");
          const notes = localStorage.getItem(`product-notes-${product.id}`) || "";
          const backendHash = getBackendHash(product);
          const savedHash = localStorage.getItem(`product-backend-hash-${product.id}`);
          const published = enhancement && savedHash === backendHash;

          return {
            id: product.id,
            name: product.name,
            price_inr: Number(product.price),
            inventory: product.inventory,
            upc: product.upc,
            backendName: product.name,
            ai_name: enhancement?.ai_name || null,
            description: enhancement?.description || null,
            imgPreview: localStorage.getItem(`product-image-${product.id}`) || null,
            notes,
            backendHash,
            published
          };
        });

        setProducts(mappedProducts);
      } catch (e) {
        console.error("Product load error:", e);
        setError(
          "Unable to load products from backend. Make sure almo-pipeline is running at http://127.0.0.1:8000. " +
          (e.message || "")
        );
      } finally {
        setHydrated(true);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("shopmind-cart", JSON.stringify(cart));
  }, [cart, hydrated]);

  function handleModalImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 500;
        let w = img.width;
        let h = img.height;
        if (w > MAX) { h = (h * MAX) / w; w = MAX; }
        if (h > MAX) { w = (w * MAX) / h; h = MAX; }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL("image/jpeg", 0.5);
        setModalImgPreview(compressed);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  async function handleModalEnhance() {
    if (!selected) return;
    setModalError("");
    setModalLoading(true);
    try {
      const enhanced = await enhanceProductWithGroq({
        ...selected,
        modalNotes: modalNotes.trim()
      });
      setModalEnhanced(enhanced);
    } catch (e) {
      setModalError("Failed to enhance product: " + e.message);
    }
    setModalLoading(false);
  }

  function handlePushToStorefront() {
    if (!selected || !modalEnhanced) return;
    try {
      if (modalImgPreview) {
        localStorage.setItem(`product-image-${selected.id}`, modalImgPreview);
      }
      localStorage.setItem(`product-enhancement-${selected.id}`, JSON.stringify(modalEnhanced));
      localStorage.setItem(`product-notes-${selected.id}`, modalNotes.trim());
      localStorage.setItem(`product-backend-hash-${selected.id}`, selected.backendHash);

      const updated = products.map(p =>
        p.id === selected.id
          ? {
              ...p,
              ai_name: modalEnhanced.ai_name,
              description: modalEnhanced.description,
              imgPreview: modalImgPreview || p.imgPreview,
              published: true
            }
          : p
      );
      setProducts(updated);
      setSelected({ ...updated.find(p => p.id === selected.id) });
      setModalEnhanced(null);
      setModalImgPreview(null);
      setModalNotes("");
      setModalError("");
    } catch (e) {
      console.error("Save error:", e);
      setModalError("Failed to save enhancement");
    }
  }

  function openProduct(p) {
    setSelected({ ...p });
    setQuantity(1);
    setAddedMsg(false);
    setModalImgPreview(p.imgPreview || null);
    setModalEnhanced(null);
    setModalNotes(p.notes || "");
    setModalError("");
    setModalLoading(false);
  }

  function closeProduct() {
    setSelected(null);
    setModalImgPreview(null);
    setModalEnhanced(null);
    setModalError("");
  }

  function addToCart() {
    const existing = cart.find(c => c.id === selected.id);
    if (existing) {
      const updated = cart.map(c =>
        c.id === selected.id
          ? { ...c, quantity: c.quantity + quantity }
          : c
      );
      setCart(updated);
    } else {
      setCart([...cart, { ...selected, quantity }]);
    }
    setAddedMsg(true);
    setTimeout(() => setAddedMsg(false), 2000);
  }

  function removeFromCart(id) {
    setCart(cart.filter(c => c.id !== id));
  }

  function updateCartQty(id, qty) {
    if (qty < 1) { removeFromCart(id); return; }
    setCart(cart.map(c => c.id === id ? { ...c, quantity: qty } : c));
  }

  const cartTotal = cart.reduce((sum, c) => sum + c.price_inr * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const displayName = (p) => p.ai_name || p.name;

  return (
    <div className="app">

      {/* Header */}
      <div className="header">
        <div className="header-icon">✨</div>
        <div style={{ flex: 1 }}>
          <h1>ShopMind <span className="ai-badge">🤖 AI-powered</span></h1>
          <p>Products enriched with Groq AI</p>
        </div>
        {/* Cart Icon */}
        <button className="cart-icon-btn" onClick={() => setCartOpen(true)}>
          🛒
          {cartCount > 0 && (
            <span className="cart-count">{cartCount}</span>
          )}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="tabs">
        <button
          className={tab === "review" ? "tab active" : "tab"}
          onClick={() => setTab("review")}
        >
          📦 Review Catalog
        </button>
        <button
          className={tab === "storefront" ? "tab active" : "tab"}
          onClick={() => setTab("storefront")}
        >
          🛍️ Storefront
        </button>
      </div>

      <div className="form-section">
        {tab === "review" ? (
          products.filter(p => !p.published).length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 48 }}>✅</div>
              <p>All backend products are published.</p>
            </div>
          ) : (
            <div className="product-grid">
              {products.filter(p => !p.published).map(p => (
                <div
                  key={p.id}
                  className="product-card"
                  onClick={() => openProduct(p)}
                >
                  <img
                    src={p.imgPreview || CATEGORY_IMAGES["Electronics"]}
                    alt={displayName(p)}
                    className="product-img"
                    onError={e => {
                      e.target.src = CATEGORY_IMAGES["Electronics"];
                    }}
                  />
                  <div className="product-body">
                    <h3 className="product-name">{displayName(p)}</h3>
                    {p.description && <p className="product-tagline">{p.description.substring(0, 80)}...</p>}
                    <p className="product-price">
                      ₹{Number(p.price_inr).toLocaleString("en-IN")}
                    </p>
                    <p className="tap-hint">Tap to review</p>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          products.filter(p => p.published).length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 48 }}>🛒</div>
              <p>No products published yet.</p>
            </div>
          ) : (
            <div className="product-grid">
              {products.filter(p => p.published).map(p => (
                <div
                  key={p.id}
                  className="product-card"
                  onClick={() => openProduct(p)}
                >
                  <img
                    src={p.imgPreview || CATEGORY_IMAGES["Electronics"]}
                    alt={displayName(p)}
                    className="product-img"
                    onError={e => {
                      e.target.src = CATEGORY_IMAGES["Electronics"];
                    }}
                  />
                  <div className="product-body">
                    <h3 className="product-name">{displayName(p)}</h3>
                    {p.description && <p className="product-tagline">{p.description.substring(0, 80)}...</p>}
                    <p className="product-price">
                      ₹{Number(p.price_inr).toLocaleString("en-IN")}
                    </p>
                    <p className="tap-hint">Tap to view</p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Product Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={closeProduct}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight: "90vh", overflowY: "auto" }}>
            <button className="modal-close" onClick={closeProduct}>✕</button>

            {/* Image Section */}
            <div>
              <img
                src={modalImgPreview || selected.imgPreview || CATEGORY_IMAGES["Electronics"]}
                alt={displayName(selected)}
                className="modal-img"
                onError={e => {
                  e.target.src = CATEGORY_IMAGES["Electronics"];
                }}
              />
              {!selected.published && (
                <div style={{ padding: "10px", textAlign: "center" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px" }}>
                    📸 Upload or Change Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleModalImageUpload}
                    style={{
                      padding: "8px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      cursor: "pointer",
                      width: "100%",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              )}
            </div>

            <div className="modal-body">
              <h2 className="modal-name">
                {selected.backendName}
                {selected.ai_name && <span style={{ fontSize: "0.8em", display: "block", color: "#666" }}>→ {selected.ai_name}</span>}
              </h2>
              {selected.description && <p className="modal-desc">{selected.description}</p>}
              <p className="modal-price">
                ₹{Number(selected.price_inr).toLocaleString("en-IN")}
              </p>
              {!selected.published && (
                <p style={{ fontSize: "12px", color: "#999" }}>
                  Inventory: {selected.inventory} | UPC: {selected.upc}
                </p>
              )}
              {selected.notes && (
                <p style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
                  <strong>Notes:</strong> {selected.notes}
                </p>
              )}

              {/* Enhancement Section */}
              {!selected.published && (
                <div style={{ margin: "16px 0", padding: "12px", backgroundColor: "#f9f9f9", borderRadius: "4px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px" }}>
                    Optional product notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Add extra context or features to highlight (optional)"
                    value={modalNotes}
                    onChange={e => setModalNotes(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd", resize: "vertical", marginBottom: "12px" }}
                  />
                  <button
                    className="generate-btn"
                    onClick={handleModalEnhance}
                    disabled={modalLoading}
                    style={{ width: "100%" }}
                  >
                    {modalLoading ? "⏳ Enhancing..." : "✨ Enhance with Groq AI"}
                  </button>
                  {modalError && <div className="error-box" style={{ marginTop: "8px" }}>{modalError}</div>}
                  {modalEnhanced && (
                    <div style={{ marginTop: "12px" }}>
                      <p style={{ fontSize: "12px", fontWeight: "bold" }}>🤖 AI Enhancement Preview:</p>
                      <p style={{ fontSize: "14px", fontWeight: "bold", color: "#0070c9" }}>{modalEnhanced.ai_name}</p>
                      <p style={{ fontSize: "13px", lineHeight: "1.4" }}>{modalEnhanced.description}</p>
                      <button
                        className="publish-btn"
                        onClick={handlePushToStorefront}
                        style={{ width: "100%", marginTop: "8px" }}
                      >
                        ✅ Push to Storefront
                      </button>
                    </div>
                  )}
                </div>
              )}

              {selected.published ? (
                <>
                  <div className="qty-row">
                    <label className="qty-label">Quantity</label>
                    <div className="qty-selector">
                      <button
                        className="qty-btn"
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      >−</button>
                      <span className="qty-value">{quantity}</span>
                      <button
                        className="qty-btn"
                        onClick={() => setQuantity(q => q + 1)}
                      >+</button>
                    </div>
                  </div>

                  <p className="qty-total">
                    Total: ₹{Number(selected.price_inr * quantity).toLocaleString("en-IN")}
                  </p>

                  {addedMsg && (
                    <div className="added-msg">✅ Added to cart!</div>
                  )}

                  <button className="add-cart-btn" onClick={addToCart}>
                    🛒 Add to Cart
                  </button>
                </>
              ) : (
                <div style={{ marginTop: 16, padding: 12, backgroundColor: "#f5f5ff", borderRadius: 8, color: "#555", fontSize: 14 }}>
                  Publish this item to the storefront to enable cart actions.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cart Sidebar */}
      {cartOpen && (
        <div className="modal-overlay" onClick={() => setCartOpen(false)}>
          <div className="cart-sidebar" onClick={e => e.stopPropagation()}>
            <div className="cart-header">
              <h2>🛒 Your Cart</h2>
              <button className="modal-close" onClick={() => setCartOpen(false)}>✕</button>
            </div>

            {cart.length === 0 ? (
              <div className="cart-empty">
                <div style={{ fontSize: 40 }}>🛒</div>
                <p>Your cart is empty!</p>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map(c => (
                    <div key={c.id} className="cart-item">
                      <img
                        src={c.imgPreview || CATEGORY_IMAGES["Electronics"]}
                        alt={displayName(c)}
                        className="cart-item-img"
                        onError={e => {
                          e.target.src = CATEGORY_IMAGES["Electronics"];
                        }}
                      />
                      <div className="cart-item-info">
                        <p className="cart-item-name">{displayName(c)}</p>
                        <p className="cart-item-price">
                          ₹{Number(c.price_inr).toLocaleString("en-IN")}
                        </p>
                        <div className="qty-selector" style={{ marginTop: 6 }}>
                          <button
                            className="qty-btn"
                            onClick={() => updateCartQty(c.id, c.quantity - 1)}
                          >−</button>
                          <span className="qty-value">{c.quantity}</span>
                          <button
                            className="qty-btn"
                            onClick={() => updateCartQty(c.id, c.quantity + 1)}
                          >+</button>
                        </div>
                      </div>
                      <button
                        className="cart-remove"
                        onClick={() => removeFromCart(c.id)}
                      >✕</button>
                    </div>
                  ))}
                </div>
                <div className="cart-footer">
                  <div className="cart-total">
                    <span>Total</span>
                    <span>₹{Number(cartTotal).toLocaleString("en-IN")}</span>
                  </div>
                  <button className="checkout-btn">
                    Proceed to Checkout →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}