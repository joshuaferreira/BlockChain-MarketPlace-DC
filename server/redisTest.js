const redis = require("redis");
const client = redis.createClient({ url: "redis://localhost:6379" });

client.connect();

client.set("key", "value");
client.get("key").then(value => console.log(value));