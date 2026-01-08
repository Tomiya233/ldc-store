import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: (...args: unknown[]) => navigationMocks.push(...args),
  }),
}));

import { CardsFilters } from "@/app/(admin)/admin/cards/cards-filters";

describe("CardsFilters", () => {
  beforeEach(() => {
    navigationMocks.push.mockReset();
  });

  it("应根据表单输入生成 href 并 router.push", async () => {
    render(
      <CardsFilters
        productId="p1"
        q=""
        status={undefined}
        orderNo=""
        pageSize={20}
      />
    );

    fireEvent.change(screen.getByLabelText("搜索卡密"), {
      target: { value: " abc " },
    });
    fireEvent.change(screen.getByLabelText("按状态筛选"), {
      target: { value: "sold" },
    });
    fireEvent.change(screen.getByLabelText("按订单号查卡密"), {
      target: { value: "ORDER_1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "应用筛选" }));

    await waitFor(() => {
      // 为什么要断言 queryString：确保 trim/默认 pageSize 等归一化逻辑不会回归
      expect(navigationMocks.push).toHaveBeenLastCalledWith(
        "/admin/cards?product=p1&q=abc&status=sold&orderNo=ORDER_1&pageSize=20"
      );
    });
  });

  it("无 active filters 时应禁用重置按钮", () => {
    render(
      <CardsFilters
        productId="p1"
        q=""
        status={undefined}
        orderNo=""
        pageSize={20}
      />
    );

    expect(screen.getByRole("button", { name: "重置" })).toBeDisabled();
  });

  it("点击重置应回到基础筛选（保留 product 与 pageSize）", () => {
    render(
      <CardsFilters
        productId="p1"
        q="abc"
        status="available"
        orderNo=""
        pageSize={20}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "重置" }));
    expect(navigationMocks.push).toHaveBeenLastCalledWith("/admin/cards?product=p1&pageSize=20");
  });

  it("点击清空搜索应移除 q 参数但保留其他条件", () => {
    render(
      <CardsFilters
        productId="p1"
        q="abc"
        status="available"
        orderNo="ORDER_1"
        pageSize={20}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "清空搜索" }));
    expect(navigationMocks.push).toHaveBeenLastCalledWith(
      "/admin/cards?product=p1&status=available&orderNo=ORDER_1&pageSize=20"
    );
  });
});

