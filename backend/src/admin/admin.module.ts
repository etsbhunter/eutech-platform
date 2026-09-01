import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminGuard } from "./admin.guard";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { ProvisioningModule } from "../provisioning/provisioning.module";

@Module({
  imports: [JwtModule.register({}), ProvisioningModule],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard, AccessTokenGuard],
})
export class AdminModule {}
