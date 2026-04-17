import app from "./app";
import { logger } from "./lib/logger";
import { config } from "./lib/config";
import { autoSeed } from "./lib/autoSeed";

autoSeed().then(() => {
  app.listen(config.port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port: config.port, env: config.nodeEnv }, "Server listening");
  });
});
