const express = require("express");
const { stat } = require("fs");
const { v4: uuid } = require("uuid");

const app = express();

app.use(express.json());

const port = 8080;

const customers = [];

function verifyIfExistsAccountCPF(req, res, next) {
  const { cpf } = req.params;

  const customer = customers.find((customer) => {
    return customer.cpf === cpf;
  });

  if (!customer) {
    return res.status(400).json({ error: "Customer not found" });
  }

  // Dessa forma eu jogo a informação para rota que pedir o req.customer
  req.customer = customer;

  return next();
}

function getBallance(statement) {
  const balance = statement.reduce((acc, item) => {
    if (item.type === "credit") {
      return acc + item.value;
    } else if (item.type === "debit") {
      return acc - item.value;
    }
  }, 0);

  return balance;
}

// Caso eu precise do middleware em todas as rotas eu uso assim:
// app.use(verifyIfExistsAccountCPF);

// Caso eu precise do middleware em 1 rota, então coloco na rota

app.post("/account", (req, res) => {
  const { cpf, name } = req.body;

  const customerAlreadyExists = customers.some((customer) => {
    return customer.cpf === cpf;
  });

  if (customerAlreadyExists)
    return res.status(400).json({ error: "User ja criado", code: "400" });

  customers.push({
    cpf,
    name,
    id: uuid(),
    statement: [],
  });

  return res.status(200).send(customers);
});

app.get("/account", (req, res) => {
  return res.status(200).json(customers);
});

app.get("/account/:cpf", verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;

  return res.status(200).json(customer);
});

app.put("/account/:cpf", verifyIfExistsAccountCPF, (req, res) => {
  const { name } = req.body;
  const { customer } = req;

  customer.name = name;

  return res.status(200).json(customer);
});

app.delete("/account/:cpf", verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;

  customers.splice(customer, 1);

  return res.status(200).send("Deu certo");
});

app.get("/statement/:cpf", verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;

  return res.status(200).json(customer.statement);
});

app.get("/statement/date/:cpf", verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;
  const { date } = req.query;

  const dateFormat = new Date(date + " 00:00");

  const statement = customer.statement.filter((state) => {
    return (
      state.created_at.toDateString() === new Date(dateFormat).toDateString()
    );
  });

  return res.status(200).json(statement);
});

app.post("/deposit/:cpf", verifyIfExistsAccountCPF, (req, res) => {
  const { value, description } = req.body;
  const { customer } = req;

  const statementOperation = {
    description,
    value,
    created_at: new Date(),
    type: "credit",
  };

  customer.statement.push(statementOperation);

  return res.status(201).send(`Deposito de R$${value} efetuado com sucesso!`);
});

app.post("/withdraw/:cpf", verifyIfExistsAccountCPF, (req, res) => {
  const { value, description } = req.body;
  const { customer } = req;

  const total = getBallance(customer.statement);

  if (total - value >= 0) {
    const statementOperation = {
      description,
      value: value,
      created_at: new Date(),
      type: "debit",
    };

    customer.statement.push(statementOperation);

    return res.status(200).send(`Saque de R$${value} efetuado com sucesso!`);
  }

  return res.status(400).json({ error: "Saldo insuficiente!" });
});

app.listen(port);
