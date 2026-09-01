import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  // rawBody:true preserves the raw request Buffer (req.rawBody) alongside
  // the normal parsed body, needed to verify the LemonSqueezy webhook
  // signature against the exact bytes that were signed.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(helmet());
  app.use(cookieParser());
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Comma-separated list, so both the raw dev port and any Laragon-style
  // pretty domain (e.g. eutech-platform.test) can be allowed at once.
  const frontendOrigins = (process.env.FRONTEND_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: frontendOrigins,
    credentials: true,
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
}

bootstrap();
