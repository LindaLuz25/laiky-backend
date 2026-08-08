const express = require("express");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const router = express.Router();
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.ORDERS_TABLE;

const ESTADOS_VALIDOS = ["PENDIENTE", "CONFIRMADO", "EN_CAMINO", "ENTREGADO", "CANCELADO"];

// GET /admin/orders -> todos los pedidos (mas nuevos primero se ordenan en el frontend)
router.get("/", async (req, res) => {
  const result = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
  res.json(result.Items || []);
});

router.get("/:id", async (req, res) => {
  const result = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { id: req.params.id } }));
  if (!result.Item) return res.status(404).json({ message: "Pedido no encontrado" });
  res.json(result.Item);
});

// PUT /admin/orders/:id/status -> actualizar el estado del pedido
router.put("/:id/status", async (req, res) => {
  const { status } = req.body;
  if (!ESTADOS_VALIDOS.includes(status)) {
    return res.status(400).json({ message: `status debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}` });
  }

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id: req.params.id },
      UpdateExpression: "SET #status = :status",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":status": status },
      ReturnValues: "ALL_NEW",
    })
  );
  res.json(result.Attributes);
});

module.exports = router;
