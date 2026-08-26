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

3. **百度翻译 API 配置**
   - ✅ 已预配置（APP ID: `20260826002673323`）
   - 如需修改，可通过环境变量覆盖：
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

### v2.0 推荐用法（自动检测基底）

```bash
# 最简单的用法 - 自动使用本地基底模板
python scripts/localize_v2.py <新俄服文件路径> [输出文件路径] [版本标签]
```

### 示例

```bash
# 基本用法（自动生成版本标识）
python scripts/localize_v2.py "C:\Games\RF4_Update\resources.assets"

# 指定输出文件名和版本标签
python scripts/localize_v2.py resources_v2.assets resources_v2_cn.assets v2.1_20260826

# 手动指定基底模板
python scripts/localize_v2.py new_ru.assets new_cn.assets base_ru.assets base_cn.assets
```

### 版本管理

每次运行后会生成两个文件：
- `resources_cn.assets` - 汉化后的游戏文件
- `resources_cn_version.json` - 版本信息和统计

查看版本历史：
```bash
cat resources_cn_version.json
```
```

### 无 API Key 模式

如果不配置百度翻译 API，工具会跳过翻译步骤，仅提取文本结构。当前已预配置默认 API Key，可直接使用。

## 📊 工作原理

### v2.0 双基底模板架构

1. **基底模板建立**
   - 俄服基线：`C:\Users\book\Desktop\汉化\俄服文件\resources.assets`
   - 汉化基线：`C:\Users\book\Desktop\汉化\汉化文件\resources.assets`
   - 通过对比两个文件，建立精确的俄文→中文映射关系

2. **增量检测机制**
   - 解析新俄服文件的所有文本对象
   - 与基底模板进行对比，识别新增/修改的文本
   - 仅对增量部分调用翻译 API

3. **版本标识系统**
   - 每次生成汉化文件时自动创建版本信息
   - 保存为 `resources_cn_version.json`
   - 包含时间戳、统计信息和映射表大小

4. **智能缓存策略**
   - 翻译结果保存到 `translation_map_v2.json`
   - 下次运行自动加载，避免重复翻译
   - 支持跨会话复用

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
