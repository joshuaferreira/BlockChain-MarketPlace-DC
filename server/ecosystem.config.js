module.exports = {
    apps: [
      {
        name: "app-instance-1",
        script: "./index.js",
        env: {
          PORT: 5000
        }
      },
      {
        name: "app-instance-2",
        script: "./index.js",
        env: {
          PORT: 5001
        }
      },
      {
        name: "app-instance-3",
        script: "./index.js",
        env: {
          PORT: 5002
        }
      }
    ]
  };