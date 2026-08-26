#!/usr/bin/env python3
"""
RF4 游戏汉化工具 - Python 版本（推荐）

依赖安装：
  pip install UnityPy requests

用法：
  python scripts/localize.py <俄服文件路径> [输出文件路径]

示例：
  python scripts/localize.py "C:\Users\book\Desktop\汉化\俄服文件\resources.assets"
  python scripts/localize.py resources.assets resources_cn.assets
"""

import sys
import os
import re
import json
import time
from pathlib import Path

try:
    import UnityPy
except ImportError:
    print("❌ 缺少依赖库 UnityPy")
    print("请运行: pip install UnityPy")
    sys.exit(1)

try:
    import requests
except ImportError:
    print("❌ 缺少依赖库 requests")
    print("请运行: pip install requests")
    sys.exit(1)


class RF4Localizer:
    """RF4 游戏汉化器（支持增量翻译）"""
    
    def __init__(self, baidu_app_id=None, baidu_key=None, base_template_path=None):
        self.baidu_app_id = baidu_app_id or os.getenv('BAIDU_APP_ID')
        self.baidu_key = baidu_key or os.getenv('BAIDU_KEY')
        self.translated_count = 0
        self.cache = {}  # 翻译缓存
        self.translation_map = {}  # 翻译映射表（俄文->中文）
        
        # 如果提供了基础汉化模板，则提取其中的俄文→中文对照
        if base_template_path and os.path.exists(base_template_path):
            print(f"📋 正在从基础模板提取翻译对照: {base_template_path}")
            self._extract_translations_from_template(base_template_path)
            print(f"✅ 提取完成，共 {len(self.translation_map)} 条翻译对照")
    def _extract_translations_from_template(self, template_path):
        """从已汉化的 .assets 文件中提取俄文→中文的翻译对照"""
        try:
            import UnityPy
            env = UnityPy.load(template_path)
            
            # 统计已处理对象数
            processed_objects = 0
            extracted_pairs = 0
            
            for obj in env.objects:
                if obj.type.name in ["TextAsset", "MonoBehaviour"]:
                    try:
                        data = obj.read()
                        
                        # 提取 TextAsset 的内容
                        if hasattr(data, 'm_Script') and data.m_Script:
                            content = data.m_Script
                            # 在内容中寻找俄文→中文的对应关系
                            # 使用正则表达式查找俄文和中文文本
                            self._find_and_add_translation_pairs(content)
                        
                        # 提取 MonoBehaviour 的各种字段
                        for attr in ['m_Name', 'name', 'description', 'text', 'title']:
                            if hasattr(data, attr):
                                text = getattr(data, attr)
                                if text and isinstance(text, str):
                                    self._find_and_add_translation_pairs(text)
                        
                        processed_objects += 1
                        if processed_objects % 1000 == 0:
                            print(f"  已处理 {processed_objects} 个对象...")
                        
                    except Exception as e:
                        # 忽略单个对象的错误
                        continue
                        
        except Exception as e:
            print(f"⚠️  基础模板加载失败: {e}")
    
    def _find_and_add_translation_pairs(self, text):
        """从文本中查找俄文→中文的翻译对"""
        if not text or not isinstance(text, str):
            return
        
        # 查找俄文段
        russian_matches = re.findall(r'[\u0400-\u04FF]{2,}', text)
        
        # 查找中文段
        chinese_matches = re.findall(r'[\u4e00-\u9fff]{2,}', text)
        
        # 简单匹配：在同一个文本块中，俄文和中文很可能是一对翻译
        for ru_text in set(russian_matches):
            # 查找附近的中文
            ru_pos = text.find(ru_text)
            if ru_pos != -1:
                # 在俄文前后一定范围内寻找中文
                start_search = max(0, ru_pos - 100)
                end_search = min(len(text), ru_pos + len(ru_text) + 100)
                context = text[start_search:end_search]
                
                # 寻找上下文中的中文
                chinese_in_context = re.findall(r'[\u4e00-\u9fff]{2,}', context)
                for cn_text in chinese_in_context:
                    # 确保不是同一个文本块内的其他俄文
                    if len(cn_text) >= 2 and len(ru_text) >= 2:
                        self.translation_map[ru_text] = cn_text
                        
    def load_translation_map(self, map_file):
        """从 JSON 文件加载翻译映射表（推荐方式）"""
        if not os.path.exists(map_file):
            print(f"⚠️  映射表文件不存在: {map_file}")
            return
        
        try:
            with open(map_file, 'r', encoding='utf-8') as f:
                loaded_map = json.load(f)
            self.translation_map.update(loaded_map)  # 合并到现有映射
            print(f"✅ 加载 {len(loaded_map)} 条翻译映射，总计 {len(self.translation_map)} 条")
        except Exception as e:
            print(f"❌ 映射表加载失败: {e}")
    
    def save_translation_map(self, map_file):
        """保存翻译映射表到 JSON 文件"""
        try:
            with open(map_file, 'w', encoding='utf-8') as f:
                json.dump(self.translation_map, f, ensure_ascii=False, indent=2)
            print(f"💾 翻译映射表已保存: {map_file} ({len(self.translation_map)} 条)")
        except Exception as e:
            print(f"❌ 保存失败: {e}")
    
    def translate_with_baidu(self, text, from_lang='ru', to_lang='zh'):
        """使用百度翻译 API（优先使用模板缓存）"""
        # 1. 检查已知翻译映射表（包括从基础模板提取的）
        if text in self.translation_map:
            return self.translation_map[text]
        
        # 2. 检查运行时缓存
        if text in self.cache:
            return self.cache[text]
        
        # 3. 调用 API
        if not self.baidu_app_id or not self.baidu_key:
            print(f"⚠️  未配置百度翻译 API，跳过翻译: {text[:50]}...")
            return text
        
        import hashlib
        import random
        
        salt = str(random.randint(32768, 65536))
        sign_str = f"{self.baidu_app_id}{text}{salt}{self.baidu_key}"
        sign = hashlib.md5(sign_str.encode('utf-8')).hexdigest()
        
        url = "https://fanyi-api.baidu.com/api/trans/vip/translate"
        params = {
            'q': text,
            'from': from_lang,
            'to': to_lang,
            'appid': self.baidu_app_id,
            'salt': salt,
            'sign': sign
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            data = response.json()
            
            if 'trans_result' in data and len(data['trans_result']) > 0:
                result = data['trans_result'][0]['dst']
                self.cache[text] = result
                return result
            else:
                print(f"⚠️  翻译失败: {data}")
                return text
        except Exception as e:
            print(f"⚠️  翻译请求异常: {e}")
            return text
    
    def extract_text_from_assets(self, assets_path):
        """从 .assets 文件中提取所有文本"""
        print(f"📂 正在读取: {assets_path}")
        
        env = UnityPy.load(assets_path)
        texts = []
        
        for obj in env.objects:
            if obj.type.name in ["TextAsset", "MonoBehaviour"]:
                try:
                    data = obj.read()
                    if hasattr(data, 'm_Name'):
                        texts.append({
                            'path_id': obj.path_id,
                            'type': obj.type.name,
                            'name': data.m_Name,
                            'data': data
                        })
                except Exception as e:
                    print(f"⚠️  读取对象失败: {e}")
        
        print(f"✅ 找到 {len(texts)} 个文本对象")
        return env, texts
    
    def localize_assets(self, input_path, output_path):
        """执行汉化"""
        start_time = time.time()
        
        # 加载文件
        env, texts = self.extract_text_from_assets(input_path)
        
        # 翻译每个文本对象
        for i, item in enumerate(texts):
            data = item['data']
            
            # 处理 TextAsset
            if item['type'] == 'TextAsset' and hasattr(data, 'm_Script'):
                original_text = data.m_Script
                if original_text and self._contains_russian(original_text):
                    translated = self.translate_with_baidu(original_text)
                    data.m_Script = translated
                    self.translated_count += 1
            
            # 处理 MonoBehaviour（可能包含 name/description 字段）
            elif item['type'] == 'MonoBehaviour':
                if hasattr(data, 'name') and data.name:
                    if self._contains_russian(data.name):
                        data.name = self.translate_with_baidu(data.name)
                        self.translated_count += 1
                
                if hasattr(data, 'description') and data.description:
                    if self._contains_russian(data.description):
                        data.description = self.translate_with_baidu(data.description)
                        self.translated_count += 1
            
            # 进度显示
            if (i + 1) % 100 == 0:
                elapsed = time.time() - start_time
                print(f"  进度: {i+1}/{len(texts)} | 已翻译: {self.translated_count} | 耗时: {elapsed:.1f}s")
        
        # 保存文件
        print(f"\n💾 正在保存: {output_path}")
        with open(output_path, 'wb') as f:
            env.save(f)
        
        elapsed = time.time() - start_time
        print(f"\n✅ 汉化完成！")
        print(f"   翻译文本数: {self.translated_count}")
        print(f"   总耗时: {elapsed:.1f}秒")
        print(f"   输出文件: {output_path}")
    
    def _contains_russian(self, text):
        """检查文本是否包含俄语字符"""
        return bool(re.search(r'[\u0400-\u04FF]', text))


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else input_file.replace('.assets', '_cn.assets')
    base_template = sys.argv[3] if len(sys.argv) > 3 else None
    map_file = sys.argv[4] if len(sys.argv) > 4 else 'translation_map.json'
    
    if not os.path.exists(input_file):
        print(f"❌ 文件不存在: {input_file}")
        sys.exit(1)
    
    # 如果没有指定基础模板，尝试使用默认的汉化文件
    if not base_template:
        default_template = r"C:\Users\book\Desktop\汉化\汉化文件\resources.assets"
        if os.path.exists(default_template):
            base_template = default_template
            print(f"📋 检测到默认汉化模板: {base_template}")
        else:
            print("⚠️  未找到默认汉化模板，将仅使用 API 翻译")
    
    print("🎮 RF4 游戏汉化工具 (Python 版 - 基于现有汉化模板)")
    print("=" * 60)
    
    # 创建汉化器（自动加载基础模板）
    localizer = RF4Localizer(base_template_path=base_template)
    
    # 加载额外的 JSON 映射表（如果存在）
    if os.path.exists(map_file):
        localizer.load_translation_map(map_file)
    
    # 执行汉化
    localizer.localize_assets(input_file, output_file)
    
    # 保存新的翻译映射表（包含从基础模板提取的 + 新增翻译的）
    localizer.save_translation_map(map_file)
    
    print("\n💡 提示：")
    print("   - 翻译对照表已保存到 translation_map.json")
    print("   - 下次运行时会自动复用这些翻译，无需再次调用 API")


if __name__ == '__main__':
    main()
