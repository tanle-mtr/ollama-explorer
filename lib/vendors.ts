/**
 * 模型厂商分类映射
 * 根据模型名称特征归类到对应厂商
 */

export interface Vendor {
  id: string;
  name: string;
  color: string;
  models: string[];
}

/**
 * 根据模型名称判断所属厂商
 */
export function getModelVendor(modelName: string): string | null {
  const name = modelName.toLowerCase();
  
  // DeepSeek
  if (name.includes("deepseek")) return "deepseek";
  
  // GLM (智谱AI)
  if (name.includes("glm")) return "glm";
  
  // Kimi (月之暗面)
  if (name.includes("kimi")) return "kimi";
  
  // MiniMax
  if (name.includes("minimax")) return "minimax";
  
  // Qwen (阿里通义)
  if (name.includes("qwen")) return "qwen";
  
  // Llama (Meta)
  if (name.startsWith("llama")) return "llama";
  
  // Mistral
  if (name.includes("mistral")) return "mistral";
  
  // Gemma (Google)
  if (name.includes("gemma")) return "gemma";
  
  // Phi (Microsoft)
  if (name.includes("phi")) return "phi";
  
  // Nomic
  if (name.includes("nomic")) return "nomic";
  
  // GPT-OSS (OpenRouter)
  if (name.includes("gpt-oss") || name.includes("gptoss")) return "gpt-oss";
  
  // Gemini
  if (name.includes("gemini")) return "gemini";
  
  // Claude
  if (name.includes("claude")) return "claude";
  
  // Mixtral
  if (name.includes("mixtral")) return "mixtral";
  
  // Codestral
  if (name.includes("codestral")) return "codestral";
  
  // Command R
  if (name.includes("command-r")) return "command-r";
  
  // Default to "other"
  return null;
}

/**
 * 厂商配置
 */
export const VENDORS: Vendor[] = [
  { id: "deepseek", name: "DeepSeek", color: "bg-violet-500", models: [] },
  { id: "glm", name: "GLM (智谱)", color: "bg-blue-500", models: [] },
  { id: "kimi", name: "Kimi (月之暗面)", color: "bg-cyan-500", models: [] },
  { id: "minimax", name: "MiniMax", color: "bg-green-500", models: [] },
  { id: "qwen", name: "Qwen (阿里)", color: "bg-orange-500", models: [] },
  { id: "llama", name: "Llama (Meta)", color: "bg-red-500", models: [] },
  { id: "mistral", name: "Mistral", color: "bg-yellow-500", models: [] },
  { id: "gemma", name: "Gemma (Google)", color: "bg-pink-500", models: [] },
  { id: "phi", name: "Phi (Microsoft)", color: "bg-indigo-500", models: [] },
  { id: "nomic", name: "Nomic", color: "bg-teal-500", models: [] },
  { id: "gpt-oss", name: "GPT-OSS", color: "bg-purple-500", models: [] },
  { id: "gemini", name: "Gemini", color: "bg-lime-500", models: [] },
  { id: "claude", name: "Claude", color: "bg-amber-500", models: [] },
  { id: "other", name: "其他", color: "bg-slate-500", models: [] },
];

/**
 * 根据模型列表计算各厂商的模型
 */
export function computeVendorModels(models: string[]): Map<string, string[]> {
  const vendorMap = new Map<string, string[]>();
  
  for (const model of models) {
    const vendor = getModelVendor(model) || "other";
    if (!vendorMap.has(vendor)) {
      vendorMap.set(vendor, []);
    }
    vendorMap.get(vendor)!.push(model);
  }
  
  return vendorMap;
}

/**
 * 获取厂商显示名称
 */
export function getVendorName(vendorId: string): string {
  const vendor = VENDORS.find(v => v.id === vendorId);
  return vendor?.name || vendorId;
}
