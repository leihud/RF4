# RF4 游戏汉化工具使用指南

## 📋 概述

本工具用于将 RF4（Russian Fishing 4）俄服游戏的 `resources.assets` 文件自动翻译为中文版本。

## 🔧 前置要求

### 方案 A：Python 脚本（推荐）

1. **安装 Python 3.8+**
   ```bash
   python --version
   ```

2. **安装依赖库**
   ```bash
   pip install UnityPy requests
   ```

3. **配置百度翻译 API（可选）**
   - 访问 [百度翻译开放平台](https://fanyi-api.baidu.com/)
   - 注册账号并创建应用
   - 获取 APP ID 和密钥
   - 设置环境变量：
     ```bash
     # Windows PowerShell
     $env:BAIDU_APP_ID="your_app_id"
     $env:BAIDU_KEY="your_key"
     
     # Linux/Mac
     export BAIDU_APP_ID="your_app_id"
     export BAIDU_KEY="your_key"
     ```

### 方案 B：前端页面（开发中）

当前前端 UI 已集成到 RF4 项目中，但后端处理逻辑尚未完全实现。请访问 `/localize` 页面查看进度。

## 🚀 使用方法

### 基本用法（自动使用本地汉化模板）

```bash
# 直接运行，会自动检测并使用 C:\Users\book\Desktop\汉化\汉化文件\resources.assets 作为基础模板
python scripts/localize.py <新俄服文件路径> [输出文件路径]
```

### 手动指定基础模板

```bash
# 如果默认路径不存在，可以手动指定
python scripts/localize.py resources_ru_new.assets resources_cn_new.assets "C:\path\to\base_template.assets"
```

### 示例

```bash
# 使用默认的汉化模板进行增量翻译
python scripts/localize.py "C:\Games\RF4_New\resources.assets"

# 指定输出文件名
python scripts/localize.py resources_v2.assets resources_v2_cn.assets
```

### 无 API Key 模式

如果不配置百度翻译 API，工具会跳过翻译步骤，仅提取文本结构。此时需要手动准备翻译对照表。

## 📊 工作原理

1. **解析文件**：使用 UnityPy 库解析 Unity 序列化格式
2. **提取文本**：遍历所有 TextAsset 和 MonoBehaviour 对象
3. **识别俄语**：通过 Unicode 范围检测俄语文本段
4. **调用翻译**：使用百度翻译 API 进行俄→中翻译
5. **重建文件**：将翻译后的文本写回 .assets 格式

## ⚠️ 注意事项

1. **备份原文件**：操作前请务必备份原始 `resources.assets`
2. **文件大小**：处理 375MB 文件可能需要 5-10 分钟
3. **API 限额**：百度翻译免费版每月 5 万字符，超出需付费
4. **翻译质量**：机器翻译可能存在误差，建议人工校对关键文本

## 🔍 验证汉化结果

1. 将生成的 `resources_cn.assets` 复制到游戏目录
2. 重命名为 `resources.assets`（先备份原版）
3. 启动游戏检查文本是否正常显示

## 🛠️ 故障排除

### 问题 1：缺少 UnityPy 模块
```
ModuleNotFoundError: No module named 'UnityPy'
```
**解决**：运行 `pip install UnityPy`

### 问题 2：内存不足
```
MemoryError
```
**解决**：确保系统有至少 2GB 可用内存，或关闭其他程序

### 问题 3：翻译 API 失败
```
⚠️  翻译请求异常
```
**解决**：检查网络连接，或暂时跳过翻译步骤

## 📝 高级用法

### 自定义翻译映射表

编辑 `scripts/localize.py`，在 `translate_with_baidu` 方法中添加自定义映射：

```python
def translate_with_baidu(self, text, from_lang='ru', to_lang='zh'):
    # 自定义映射优先
    custom_map = {
        "Катушка": "渔轮",
        "Удилище": "鱼竿",
        # ... 添加更多映射
    }
    if text in custom_map:
        return custom_map[text]
    
    # 否则调用 API
    # ...
```

### 批量处理多个文件

```bash
for file in *.assets; do
    python scripts/localize.py "$file" "${file%.assets}_cn.assets"
done
```

## 🤝 贡献

欢迎提交 Issue 或 Pull Request 改进此工具！

## 📄 许可证

本项目遵循与原 RF4 项目相同的许可条款。
