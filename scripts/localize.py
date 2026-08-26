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
    """RF4 游戏汉化器"""
    
    def __init__(self, baidu_app_id=None, baidu_key=None):
        self.baidu_app_id = baidu_app_id or os.getenv('BAIDU_APP_ID')
        self.baidu_key = baidu_key or os.getenv('BAIDU_KEY')
        self.translated_count = 0
        self.cache = {}  # 翻译缓存
        
    def translate_with_baidu(self, text, from_lang='ru', to_lang='zh'):
        """使用百度翻译 API"""
        if not self.baidu_app_id or not self.baidu_key:
            print(f"⚠️  未配置百度翻译 API，跳过翻译: {text[:50]}...")
            return text
        
        # 检查缓存
        if text in self.cache:
            return self.cache[text]
        
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
    
    if not os.path.exists(input_file):
        print(f"❌ 文件不存在: {input_file}")
        sys.exit(1)
    
    print("🎮 RF4 游戏汉化工具 (Python 版)")
    print("=" * 60)
    
    # 创建汉化器
    localizer = RF4Localizer()
    
    # 执行汉化
    localizer.localize_assets(input_file, output_file)


if __name__ == '__main__':
    main()
