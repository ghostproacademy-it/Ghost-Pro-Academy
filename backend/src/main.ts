import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}

// Local development
bootstrap();

// AWS Lambda handler
export const handler = async (event: any, context: any) => {
  const { configure } = await import('@codegenie/serverless-express');
  const expressApp = await NestFactory.create(AppModule);
  await expressApp.init();
  const server = configure({ app: expressApp.getHttpAdapter().getInstance() });
  return server(event, context);
};
