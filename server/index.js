require("dotenv").config(); //use dotenv
const express = require("express"); //express for server setup
const {Web3} = require("web3"); //for interacting with blockchain
const fs = require("fs"); //to interact with file directories / folders
const path = require("path"); //also for folders

// const redis = require("redis");
// const { promisify } = require("util");
// const redisClient = redis.createClient();
// const getAsync = promisify(redisClient.get).bind(redisClient);
// const setAsync = promisify(redisClient.setex).bind(redisClient); 

const app = express();
app.use(express.json()); //built in middleware

const web3 = new Web3(process.env.GANACHE_URL);

//tells us available functions for the smart contract, acts as an interface for JS to interact with blockchain
let contractABI;
try {
  contractABI = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "contracts", "Marketplace.json")).toString()
  ).abi;
} catch (err) {
  console.error("Failed to load contract ABI:", err);
  process.exit(1);
}

//our smart contract is deployed on local ganache blockchain ethereum network
//address of the contract is necessary to tell use which blockchain
const contractAddress = process.env.CONTRACT_ADDRESS;

//create an instance of the contract, can be used for calls and other blockchain functionalities
const contract = new web3.eth.Contract(contractABI, contractAddress);


// Set default account (you can modify this dynamically)
let defaultAccount;
web3.eth.getAccounts().then(accounts => {
  defaultAccount = accounts[1]; // Treat this as the seller
  web3.eth.defaultAccount = defaultAccount;
});

function cleanBigInts(obj) {
    return JSON.parse(JSON.stringify(obj, (_, v) =>
      typeof v === "bigint" ? v.toString() : v
    ));
  }

//middleware
function bigIntCleaner() {
    return (req, res, next) => {
      // Override json method
      const originalJson = res.json;
      res.json = function(data) {
        originalJson.call(this, cleanBigInts(data));
      };
      
      // Override status method to ensure errors get cleaned too
      const originalStatus = res.status;
      res.status = function(code) {
        const newRes = originalStatus.call(this, code);
        newRes.json = (data) => originalJson.call(this, cleanBigInts(data));
        return newRes;
      };
      
      next();
    };
}

// ROUTES
app.post("/product/create", bigIntCleaner(), async (req, res) => {

    //get parameters from request body
  const { name, description, priceInEther, stock } = req.body;

  try {

    //all transacted in wei, not ether
    //if ether->rupee, then wei->paise
    //can't use fraction for ether
    const price = web3.utils.toWei(priceInEther, "ether");
    
    //call method
    const tx = await contract.methods
      .createProduct(name, description, price, stock)
      .send({ from: defaultAccount, gas: 500000 });

    res.json({ status: "Product Created", tx });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/product/:id", bigIntCleaner(),async (req, res) => {
  const id = req.params.id;

  try {
    const product = await contract.methods.getProduct(id).call();
    res.json({ product });
  } catch (err) {
    res.status(400).json({ error: err.cause.message });
  }
});

app.post("/product/update", bigIntCleaner(),async (req, res) => {
  const { id, name, description, priceInEther, isActive, stock } = req.body;

  try {
    const price = web3.utils.toWei(priceInEther, "ether");

    const tx = await contract.methods
      .updateProduct(id, name, description, price, isActive, stock)
      .send({ from: defaultAccount, gas: 500000 });

    res.json({ status: "Product Updated", tx });
  } catch (err) {
    res.status(400).json({ error: err});
  }
});

app.post("/product/purchase", bigIntCleaner(), async (req, res) => {
  const { productId, quantity, buyerIndex } = req.body;

  try {
    // Get product details
    const product = await contract.methods.getProduct(productId).call();
    
    // Type checking before calculation
    const typesBefore = {
      productPrice: {
        value: product.price,
        type: typeof product.price
      },
      quantity: {
        value: quantity,
        type: typeof quantity
      }
    };

    // Convert values to BigInt explicitly
    const priceBigInt = BigInt(product.price);
    const quantityBigInt = BigInt(quantity);
    const totalPrice = priceBigInt * quantityBigInt;
    
    // Type checking after calculation
    const typesAfter = {
      totalPrice: {
        value: totalPrice.toString(),
        type: typeof totalPrice
      }
    };

    // Get buyer account
    const accounts = await web3.eth.getAccounts();
    const buyer = accounts[buyerIndex || 2];

    // Execute purchase
    const tx = await contract.methods
      .purchaseProduct(productId, quantity)
      .send({ 
        from: buyer, 
        value: totalPrice.toString(), // Convert BigInt to string for transaction
        gas: 500000 
      });

    // Return success response with type information
    res.json({ 
      status: "Product Purchased", 
      tx,
      typeInfo: {
        beforeCalculation: typesBefore,
        afterCalculation: typesAfter
      }
    });
  } catch (err) {
    res.status(400).json({ 
      error: err.message,
      typeInfo: {
        productPrice: product?.price ? typeof product.price : 'undefined',
        quantity: quantity ? typeof quantity : 'undefined',
        totalPrice: totalPrice ? typeof totalPrice : 'undefined'
      }
    });
  }
});

app.get("/seller/products", bigIntCleaner(),async (req, res) => {
  try {
    const productIds = await contract.methods.getSellerProducts().call({ from: defaultAccount });

    const products = await Promise.all(
      productIds.map(id => contract.methods.getProduct(id).call())
    );

    res.json({ products });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/orders/:buyer", bigIntCleaner(), async (req, res) => {
  const { buyer } = req.params;
  try {
    const orderIds = await contract.methods.userOrders(buyer).call();
    res.json({ orderIds });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/buyer/orders", bigIntCleaner(),async (req, res) => {
  try {
    const accounts = await web3.eth.getAccounts();
    const buyer = accounts[2]; // or dynamically get from query/header/etc

    const orderIds = await contract.methods.getBuyerOrders().call({ from: buyer });

    res.json({ buyer, orderIds });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/port", async(req,res) =>{
    res.send(`Running on port ${PORT}`);
  }
);


//get port from .env or use 5000 if not available
const PORT = process.env.PORT || 5000;

//message displayed, for running server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
  
