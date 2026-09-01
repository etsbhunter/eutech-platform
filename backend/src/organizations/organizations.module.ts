import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";
import { ProductProfileService } from "./product-profile.service";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { ProvisioningModule } from "../provisioning/provisioning.module";

@Module({
  imports: [JwtModule.register({}), ProvisioningModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, ProductProfileService, AccessTokenGuard],
})
export class OrganizationsModule {}
