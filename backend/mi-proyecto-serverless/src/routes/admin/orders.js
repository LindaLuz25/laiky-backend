const express = require("express");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const router = express.Router();
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.ORDERS_TABLE;

const ESTADOS_VALIDOS = ["PENDIENTE", "CONFIRMADO", "EN_CAMINO", "ENTREGADO", "CANCELADO"];

router.get("/", async (req, res) => {
  const result = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
  console.log(`Pedidos encontrados (admin): ${result.Items.length}`);
  res.json(result.Items || []);
});

router.get("/:id", async (req, res) => {
  const result = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { id: req.params.id } }));
  if (!result.Item) {
    console.log(`Pedido no encontrado: ${req.params.id}`);
    return res.status(404).json({ message: "Pedido no encontrado" });
  }
  res.json(result.Item);
});

router.put("/:id/status", async (req, res) => {
  const { status } = req.body;
  if (!ESTADOS_VALIDOS.includes(status)) {
    console.log(`Cambio de estado rechazado para pedido ${req.params.id}: status invalido (${status})`);
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
  console.log(`Estado del pedido ${req.params.id} actualizado exitosamente a ${status}`);
  res.json(result.Attributes);
});

module.exports = router;
