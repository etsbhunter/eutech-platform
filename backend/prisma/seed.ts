import { PrismaClient, BillingInterval, OrganizationRole } from "@prisma/client";
import { hashPassword } from "../src/common/password";

const prisma = new PrismaClient();

// Local development only, mirroring clinic-platform's own documented demo
// seed pattern (see docs/LOCAL_SETUP_WINDOWS.md). This account is how you
// reach the Eutech Admin screens locally; it is never created outside a
// seed run.
const EUTECH_ADMIN_EMAIL = "admin@eutech.internal";
const EUTECH_ADMIN_PASSWORD = "EutechAdmin123!";

async function seedEutechAdmin() {
  const passwordHash = await hashPassword(EUTECH_ADMIN_PASSWORD);
  const adminUser = await prisma.user.upsert({
    where: { email: EUTECH_ADMIN_EMAIL },
    update: {},
    create: {
      email: EUTECH_ADMIN_EMAIL,
      passwordHash,
      fullName: "Eutech Admin",
      emailVerified: new Date(),
    },
  });

  const internalOrg = await prisma.organization.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Eutech Internal Operations",
    },
  });

  await prisma.organizationMembership.upsert({
    where: { userId_organizationId: { userId: adminUser.id, organizationId: internalOrg.id } },
    update: { role: OrganizationRole.EUTECH_INTERNAL_ADMIN },
    create: {
      userId: adminUser.id,
      organizationId: internalOrg.id,
      role: OrganizationRole.EUTECH_INTERNAL_ADMIN,
    },
  });

  console.log(`Seeded Eutech admin account: ${EUTECH_ADMIN_EMAIL} / ${EUTECH_ADMIN_PASSWORD} (local dev only)`);
}

// Placeholder pricing only, per explicit product-owner approval to seed
// clearly-labelled non-final prices (see docs/BILLING_AND_WEBHOOKS.md).
// Amounts are integer minor units (cents) with an ISO currency code.
async function main() {
  const product = await prisma.product.upsert({
    where: { slug: "eutech-clinic" },
    update: {},
    create: { slug: "eutech-clinic", name: "Eutech Clinic", isActive: true },
  });

  const features = await Promise.all(
    [
      { slug: "branch_limit", name: "Branch limit" },
      { slug: "staff_seat_limit", name: "Staff seat limit" },
      { slug: "support_level", name: "Support level" },
      { slug: "integrations", name: "Integrations" },
    ].map((feature) =>
      prisma.feature.upsert({
        where: { productId_slug: { productId: product.id, slug: feature.slug } },
        update: {},
        create: { ...feature, productId: product.id },
      }),
    ),
  );
  const featureBySlug = Object.fromEntries(features.map((f) => [f.slug, f]));

  const planDefs = [
    {
      slug: "starter",
      name: "Starter",
      sortOrder: 1,
      monthlyMinorUnits: 4900,
      annualMinorUnits: 4900 * 10, // ~2 months free, placeholder only
      featureValues: {
        branch_limit: "1",
        staff_seat_limit: "5",
        support_level: "Standard",
        integrations: "None",
      },
    },
    {
      slug: "professional",
      name: "Professional",
      sortOrder: 2,
      monthlyMinorUnits: 14900,
      annualMinorUnits: 14900 * 10,
      featureValues: {
        branch_limit: "5",
        staff_seat_limit: "25",
        support_level: "Priority",
        integrations: "Standard",
      },
    },
    {
      slug: "enterprise",
      name: "Enterprise",
      sortOrder: 3,
      // No self-service price: Enterprise routes to Contact Sales.
      monthlyMinorUnits: null,
      annualMinorUnits: null,
      featureValues: {
        branch_limit: "Unlimited",
        staff_seat_limit: "Custom",
        support_level: "Dedicated",
        integrations: "Custom",
      },
    },
  ] as const;

  for (const planDef of planDefs) {
    const plan = await prisma.plan.upsert({
      where: { productId_slug: { productId: product.id, slug: planDef.slug } },
      update: { name: planDef.name, sortOrder: planDef.sortOrder },
      create: {
        productId: product.id,
        slug: planDef.slug,
        name: planDef.name,
        sortOrder: planDef.sortOrder,
      },
    });

    if (planDef.monthlyMinorUnits !== null) {
      await prisma.price.upsert({
        where: { planId_interval: { planId: plan.id, interval: BillingInterval.MONTHLY } },
        update: { amountMinorUnits: planDef.monthlyMinorUnits, isPlaceholder: true },
        create: {
          planId: plan.id,
          interval: BillingInterval.MONTHLY,
          amountMinorUnits: planDef.monthlyMinorUnits,
          currency: "USD",
          isPlaceholder: true,
        },
      });
    }
    if (planDef.annualMinorUnits !== null) {
      await prisma.price.upsert({
        where: { planId_interval: { planId: plan.id, interval: BillingInterval.ANNUAL } },
        update: { amountMinorUnits: planDef.annualMinorUnits, isPlaceholder: true },
        create: {
          planId: plan.id,
          interval: BillingInterval.ANNUAL,
          amountMinorUnits: planDef.annualMinorUnits,
          currency: "USD",
          isPlaceholder: true,
        },
      });
    }

    for (const [slug, value] of Object.entries(planDef.featureValues)) {
      await prisma.planFeature.upsert({
        where: { planId_featureId: { planId: plan.id, featureId: featureBySlug[slug].id } },
        update: { value },
        create: { planId: plan.id, featureId: featureBySlug[slug].id, value },
      });
    }
  }

  console.log(`Seeded product "${product.slug}" with ${planDefs.length} plans.`);

  await seedEutechAdmin();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
