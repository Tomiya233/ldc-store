export const dynamic = "force-dynamic";

import { getSystemSettingsForAdmin } from "@/lib/actions/system-settings";
import { SystemConfigForm } from "./system-config-form";

export default async function SystemConfigPage() {
  // 使用管理员专用函数获取完整配置（包含敏感字段）
  const settings = await getSystemSettingsForAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          系统配置
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          修改可热更新的系统配置（无需重启服务）
        </p>
      </div>

      <SystemConfigForm initialValues={settings} />
    </div>
  );
}

