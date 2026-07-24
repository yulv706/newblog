import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AdminAccessLink } from "@/components/account/admin-access-link";

describe("account admin access", () => {
  it("does not render the admin entry for reader accounts", () => {
    expect(AdminAccessLink({ role: "reader", label: "Admin dashboard" })).toBeNull();
  });

  it("renders the admin entry for administrator accounts", () => {
    const link = AdminAccessLink({
      role: "admin",
      label: "Admin dashboard",
    });

    expect(link).not.toBeNull();
    expect(link?.props.href).toBe("/admin");
  });

  it("keeps the account actions focused without a Daily shortcut", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/account/account-settings-form.tsx"),
      "utf8"
    );

    expect(source).not.toContain('href="/daily"');
    expect(source).not.toContain("dailyAction");
  });
});
