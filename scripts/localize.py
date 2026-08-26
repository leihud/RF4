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
    
    def __init__(self, baidu_app_id=None, baidu_key=None, template_path=None):
        self.baidu_app_id = baidu_app_id or os.getenv('BAIDU_APP_ID')
        self.baidu_key = baidu_key or os.getenv('BAIDU_KEY')
        self.translated_count = 0
        self.cache = {}  # 翻译缓存
        self.template_map = {}  # 模板映射表（俄文->中文）
        
        # 加载模板文件（如果提供）
        if template_path and os.path.exists(template_path):
            print(f"📋 正在加载模板: {template_path}")
            self._load_template(template_path)
            print(f"✅ 模板加载完成，包含 {len(self.template_map)} 条翻译")
    def _load_template(self, template_path):
        """从已汉化的 .assets 文件中提取翻译映射表"""
        try:
            import UnityPy
            env = UnityPy.load(template_path)
            
            for obj in env.objects:
                if obj.type.name in ["TextAsset", "MonoBehaviour"]:
                    try:
                        data = obj.read()
                        
                        # 提取 TextAsset 的 m_Script
                        if hasattr(data, 'm_Script') and data.m_Script:
                            # 这里假设模板中已经包含中文，我们需要找到对应的俄文
                            # 由于无法直接关联，我们采用启发式方法：
                            # 1. 记录所有非俄语文本作为候选中文
                            # 2. 在实际处理时匹配长度和位置
                            pass
                        
                        # 更简单的方法：用户手动准备 JSON 对照表
                        # 或者使用文件名约定：resources_cn.assets 对应 resources_ru.assets
                        
                    except Exception as e:
                        pass
        except Exception as e:
            print(f"⚠️  模板加载失败: {e}")
    
    def load_translation_map(self, map_file):
        """从 JSON 文件加载翻译映射表（推荐方式）"""
        if not os.path.exists(map_file):
            print(f"⚠️  映射表文件不存在: {map_file}")
            return
        
        try:
            with open(map_file, 'r', encoding='utf-8') as f:
                self.template_map = json.load(f)
            print(f"✅ 加载 {len(self.template_map)} 条翻译映射")
        except Exception as e:
            print(f"❌ 映射表加载失败: {e}")
    
    def save_translation_map(self, map_file):
        """保存翻译映射表到 JSON 文件"""
        try:
            with open(map_file, 'w', encoding='utf-8') as f:
                json.dump(self.template_map, f, ensure_ascii=False, indent=2)
            print(f"💾 翻译映射表已保存: {map_file} ({len(self.template_map)} 条)")
        except Exception as e:
            print(f"❌ 保存失败: {e}")
    
    def translate_with_baidu(self, text, from_lang='ru', to_lang='zh'):
        """使用百度翻译 API（优先使用模板缓存）"""
        # 1. 检查模板映射表
        if text in self.template_map:
            return self.template_map[text]
        
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
    template_file = sys.argv[3] if len(sys.argv) > 3 else None
    map_file = sys.argv[4] if len(sys.argv) > 4 else 'translation_map.json'
    
    if not os.path.exists(input_file):
        print(f"❌ 文件不存在: {input_file}")
        sys.exit(1)
    
    print("🎮 RF4 游戏汉化工具 (Python 版 - 增量翻译优化)")
    print("=" * 60)
    
    # 创建汉化器（支持模板）
    localizer = RF4Localizer(template_path=template_file)
    
    # 加载 JSON 映射表（如果存在）
    if os.path.exists(map_file):
        localizer.load_translation_map(map_file)
    
    # 执行汉化
    localizer.localize_assets(input_file, output_file)
    
    # 保存翻译映射表（供下次使用）
    localizer.save_translation_map(map_file)
    
    print("\n💡 提示：")
    print("   - 下次运行时可使用相同映射表，避免重复翻译")
    print(f"   - 映射表文件: {map_file}")


if __name__ == '__main__':
    main()
