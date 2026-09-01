import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { CatalogueService } from "./catalogue.service";

@Controller("catalogue")
export class CatalogueController {
  constructor(private readonly catalogueService: CatalogueService) {}

  @Get("products")
  async products() {
    return { data: await this.catalogueService.listProducts() };
  }

  @Get("plans")
  async plans(@Query("product") product?: string) {
    if (!product) {
      throw new BadRequestException("A product query parameter is required.");
    }
    return { data: await this.catalogueService.getProductCatalogue(product) };
  }
}
