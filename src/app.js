const express = require("express");

const publicRestaurants = require("./routes/public/restaurants");
const publicProducts = require("./routes/public/products");
const publicOrders = require("./routes/public/orders");

const adminRestaurants = require("./routes/admin/restaurants");
const adminProducts = require("./routes/admin/products");
const adminOrders = require("./routes/admin/orders");
const adminImages = require("./routes/admin/images");

const app = express();
app.use(express.json());

// ---------- Rutas publicas (sin autenticacion) ----------
app.use("/restaurants", publicRestaurants);
app.use("/products", publicProducts);
app.use("/orders", publicOrders);

// ---------- Rutas de administracion (protegidas por Cognito via API Gateway) ----------
const adminRouter = express.Router();
adminRouter.use("/restaurants", adminRestaurants);
adminRouter.use("/products", adminProducts);
adminRouter.use("/orders", adminOrders);
adminRouter.use("/images", adminImages);

app.use("/admin", adminRouter);

module.exports = app;
