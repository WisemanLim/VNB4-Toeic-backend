import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import compression from "compression";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  app.use(helmet());
  app.use(compression());
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle("Vocabulary-NB4-TOEIC API")
    .setDescription("TOEIC vocab learning REST API")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, doc);

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  Logger.log(`API ready on :${port} (docs at /docs)`, "Bootstrap");
}
bootstrap();
