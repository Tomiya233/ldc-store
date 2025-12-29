export const dynamic = "force-dynamic";

import Link from "next/link";
import { getAllProducts } from "@/lib/actions/products";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Package, Eye, EyeOff } from "lucide-react";
import { ProductActions } from "./product-actions";

export default async function ProductsPage() {
  const products = await getAllProducts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            商品管理
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            管理您的商品信息和库存
          </p>
        </div>
        <Link href="/admin/products/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            添加商品
          </Button>
        </Link>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-5 w-5" />
            商品列表 ({products.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {products.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品名称</TableHead>
                    <TableHead>分类</TableHead>
                    <TableHead className="text-right">价格</TableHead>
                    <TableHead className="text-center">库存</TableHead>
                    <TableHead className="text-center">销量</TableHead>
                    <TableHead className="text-center">状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                            {product.coverImage ? (
                              <img
                                src={product.coverImage}
                                alt={product.name}
                                className="h-10 w-10 rounded-lg object-cover"
                              />
                            ) : (
                              <Package className="h-5 w-5 text-zinc-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-zinc-900 dark:text-zinc-50">
                              {product.name}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {product.slug}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.category ? (
                          <Badge variant="secondary">
                            {product.category.name}
                          </Badge>
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium">{product.price} LDC</span>
                        {product.originalPrice && (
                          <span className="ml-1 text-xs text-zinc-400 line-through">
                            {product.originalPrice} LDC
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Badge
                            variant={
                              product.stockStats.available === 0
                                ? "destructive"
                                : product.stockStats.available < 10
                                ? "secondary"
                                : "default"
                            }
                          >
                            {product.stockStats.available}
                          </Badge>
                          <span className="text-xs text-zinc-500">
                            已售 {product.stockStats.sold}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {product.salesCount}
                      </TableCell>
                      <TableCell className="text-center">
                        {product.isActive ? (
                          <Badge className="bg-emerald-100 text-emerald-700">
                            <Eye className="mr-1 h-3 w-3" />
                            上架
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <EyeOff className="mr-1 h-3 w-3" />
                            下架
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <ProductActions
                          productId={product.id}
                          productSlug={product.slug}
                          isActive={product.isActive}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <Package className="mx-auto h-12 w-12 text-zinc-300" />
              <p className="mt-4 text-zinc-500">暂无商品</p>
              <Link href="/admin/products/new" className="mt-4 inline-block">
                <Button>添加第一个商品</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

