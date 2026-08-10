const express = require("express");
const { randomUUID } = require("crypto");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

const router = express.Router();
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sns = new SNSClient({});

const ORDERS_TABLE = process.env.ORDERS_TABLE;
const ORDERS_TOPIC_ARN = process.env.ORDERS_TOPIC_ARN;

router.post("/", async (req, res) => {
  const { restaurantId, customerName, customerPhone, address, items } = req.body;
  console.log(`Nuevo pedido recibido de ${customerName} para restaurantId=${restaurantId}, ${Array.isArray(items) ? items.length : 0} items`);

  if (!restaurantId || !customerName || !customerPhone || !address || !Array.isArray(items) || items.length === 0) {
    console.log("Pedido rechazado: faltan campos requeridos");
    return res.status(400).json({
      message: "Faltan campos: restaurantId, customerName, customerPhone, address, items[]",
    });
  }

  const order = {
    id: randomUUID(),
    restaurantId,
    customerName,
    customerPhone,
    address,
    items,
    status: "PENDIENTE",
    createdAt: new Date().toISOString(),
  };

  await docClient.send(new PutCommand({ TableName: ORDERS_TABLE, Item: order }));
  console.log(`Pedido creado exitosamente: ${order.id}`);

  if (ORDERS_TOPIC_ARN) {
    const resumen = order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ");
    await sns.send(
      new PublishCommand({
        TopicArn: ORDERS_TOPIC_ARN,
        Subject: "Nuevo pedido en Laiky",
        Message: `Pedido ${order.id}\nCliente: ${customerName} (${customerPhone})\nDireccion: ${address}\nProductos: ${resumen}`,
      })
    );
    console.log(`Notificacion de pedido ${order.id} publicada en SNS`);
  }

  res.status(201).json(order);
});

module.exports = router;
