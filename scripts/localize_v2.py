#!/usr/bin/env python3
"""
RF4 游戏汉化工具 v2.0 - 基于双基底模板的增量翻译

工作原理：
1. 上传俄服基线文件和汉化基线文件，建立俄文→中文映射
2. 上传新俄服文件，与基线对比，仅翻译增量部分
3. 生成带版本标识的汉化文件

用法：
  python scripts/localize_v2.py <俄服基线> <汉化基线> <新俄服文件> [输出文件]

示例：
  python scripts/localize_v2.py base_ru.assets base_cn.assets new_ru.assets
  python scripts/localize_v2.py base_ru.assets base_cn.assets new_ru.assets new_cn.assets
"""

import sys
import os
import re
import json
import time
from pathlib import Path
from datetime import datetime

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


class RF4LocalizerV2:
    """RF4 游戏汉化器 v2.0 - 支持双基底模板和版本管理"""
    
    def __init__(self, baidu_app_id=None, baidu_key=None):
        self.baidu_app_id = baidu_app_id or os.getenv('BAIDU_APP_ID', '20260826002673323')
        self.baidu_key = baidu_key or os.getenv('BAIDU_KEY', '_4R90VkUMKjhh08CmKru')
        self.translation_map = {}  # 俄文→中文映射表
        self.version_info = {}  # 版本信息
        self.stats = {
            'total_texts': 0,
            'matched_texts': 0,
            'new_texts': 0,
            'api_calls': 0
        }
    
    def load_base_templates(self, base_ru_path, base_cn_path):
        """加载双基底模板并建立映射关系"""
        print(f"📋 正在加载基底模板...")
        print(f"   俄服基线: {base_ru_path}")
        print(f"   汉化基线: {base_cn_path}")
        
        # 从两个文件中提取文本并建立映射
        ru_texts = self._extract_all_texts(base_ru_path)
        cn_texts = self._extract_all_texts(base_cn_path)
        
        # 建立映射关系（基于位置和内容相似度）
        self._build_translation_map(ru_texts, cn_texts)
        
        print(f"✅ 基底模板加载完成")
        print(f"   映射条目: {len(self.translation_map)}")
        print(f"   俄服基线文本数: {len(ru_texts)}")
        print(f"   汉化基线文本数: {len(cn_texts)}")
    
    def _extract_all_texts(self, assets_path):
        """从 .assets 文件中提取所有文本对象"""
        env = UnityPy.load(assets_path)
        texts = []
        
        for obj in env.objects:
            if obj.type.name in ["TextAsset", "MonoBehaviour"]:
                try:
                    data = obj.read()
                    
                    # 提取各种文本字段
                    text_fields = {}
                    
                    if hasattr(data, 'm_Script') and data.m_Script:
                        text_fields['m_Script'] = data.m_Script
                    
                    for attr in ['m_Name', 'name', 'description', 'text', 'title']:
                        if hasattr(data, attr):
                            value = getattr(data, attr)
                            if value and isinstance(value, str):
                                text_fields[attr] = value
                    
                    if text_fields:
                        texts.append({
                            'path_id': obj.path_id,
                            'type': obj.type.name,
                            'fields': text_fields
                        })
                        
                except Exception as e:
                    continue
        
        return texts
    
    def _contains_chinese(self, text):
        """检查文本是否包含中文字符"""
        return bool(re.search(r'[一-鿿]', text))
    
    def _build_translation_map(self, ru_texts, cn_texts):
        """基于位置和结构建立俄文→中文映射"""
        # 简化策略：假设两个文件的对象顺序一致
        min_len = min(len(ru_texts), len(cn_texts))
        
        for i in range(min_len):
            ru_obj = ru_texts[i]
            cn_obj = cn_texts[i]
            
            # 对每个字段尝试建立映射
            for field_name, ru_text in ru_obj['fields'].items():
                if field_name in cn_obj['fields']:
                    cn_text = cn_obj['fields'][field_name]
                    
                    # 如果俄文字段包含俄文，中文字段包含中文，建立映射
                    if self._contains_russian(ru_text) and self._contains_chinese(cn_text):
                        # 提取具体的俄文→中文对
                        self._extract_pairs_from_texts(ru_text, cn_text)
    
    def _extract_pairs_from_texts(self, ru_text, cn_text):
        """从成对的俄文和中文文本中提取具体的翻译对"""
        # 查找俄文段
        russian_segments = re.findall(r'[\u0400-\u04FF]{2,}', ru_text)
        # 查找中文段
        chinese_segments = re.findall(r'[\u4e00-\u9fff]{2,}', cn_text)
        
        # 简单配对策略：按顺序匹配
        for i, ru_seg in enumerate(russian_segments):
            if i < len(chinese_segments):
                cn_seg = chinese_segments[i]
                # 过滤掉太短的文本
                if len(ru_seg) >= 2 and len(cn_seg) >= 2:
                    self.translation_map[ru_seg] = cn_seg
    
    def localize_new_assets(self, new_ru_path, output_path, version_tag=None):
        """对新俄服文件进行汉化"""
        start_time = time.time()
        
        print(f"\n🔄 开始汉化新文件: {new_ru_path}")
        
        # 加载新文件
        env = UnityPy.load(new_ru_path)
        
        # 记录版本信息
        if not version_tag:
            version_tag = self._extract_version_from_assets(new_ru_path)
        
        self.version_info = {
            'version': version_tag,
            'base_date': datetime.now().isoformat(),
            'source_file': os.path.basename(new_ru_path),
            'translation_map_size': len(self.translation_map)
        }
        
        processed_objects = 0
        modified_objects = 0
        
        # 遍历所有对象进行翻译
        for obj in env.objects:
            if obj.type.name in ["TextAsset", "MonoBehaviour"]:
                try:
                    data = obj.read()
                    modified = False
                    
                    # 处理 TextAsset
                    if hasattr(data, 'm_Script') and data.m_Script:
                        original_text = data.m_Script
                        translated_text = self._translate_text(original_text)
                        
                        if translated_text != original_text:
                            data.m_Script = translated_text
                            modified = True
                            self.stats['total_texts'] += 1
                    
                    # 处理 MonoBehaviour 的各种字段
                    for attr in ['m_Name', 'name', 'description', 'text', 'title']:
                        if hasattr(data, attr):
                            original_value = getattr(data, attr)
                            if original_value and isinstance(original_value, str):
                                translated_value = self._translate_text(original_value)
                                
                                if translated_value != original_value:
                                    setattr(data, attr, translated_value)
                                    modified = True
                                    self.stats['total_texts'] += 1
                    
                    if modified:
                        modified_objects += 1
                    
                    processed_objects += 1
                    if processed_objects % 5000 == 0:
                        elapsed = time.time() - start_time
                        print(f"  进度: {processed_objects} 对象 | "
                              f"已匹配: {self.stats['matched_texts']} | "
                              f"新增翻译: {self.stats['new_texts']} | "
                              f"API调用: {self.stats['api_calls']} | "
                              f"耗时: {elapsed:.1f}s")
                        
                except Exception as e:
                    continue
        
        # 保存汉化后的文件
        print(f"\n💾 正在保存汉化文件: {output_path}")
        with open(output_path, 'wb') as f:
            env.save(f)
        
        # 添加版本信息到 JSON 文件
        version_file = output_path.replace('.assets', '_version.json')
        with open(version_file, 'w', encoding='utf-8') as f:
            json.dump({
                'version_info': self.version_info,
                'statistics': self.stats,
                'timestamp': datetime.now().isoformat()
            }, f, ensure_ascii=False, indent=2)
        
        elapsed = time.time() - start_time
        
        print(f"\n✅ 汉化完成！")
        print(f"   输出文件: {output_path}")
        print(f"   版本标识: {version_tag}")
        print(f"   处理对象: {processed_objects}")
        print(f"   修改对象: {modified_objects}")
        print(f"   总文本数: {self.stats['total_texts']}")
        print(f"   匹配文本: {self.stats['matched_texts']} (来自基底模板)")
        print(f"   新增翻译: {self.stats['new_texts']} (调用 API)")
        print(f"   API 调用: {self.stats['api_calls']}")
        print(f"   总耗时: {elapsed:.1f}秒")
        print(f"   版本信息: {version_file}")
    
    def _translate_text(self, text):
        """翻译单个文本（优先使用映射表）"""
        if not text or not isinstance(text, str):
            return text
        
        # 检查是否包含俄文
        if not self._contains_russian(text):
            return text
        
        # 尝试直接从映射表中查找完整文本
        if text in self.translation_map:
            self.stats['matched_texts'] += 1
            return self.translation_map[text]
        
        # 分段翻译：提取俄文段并逐个翻译
        result = text
        russian_segments = re.findall(r'[\u0400-\u04FF]{2,}', text)
        
        for ru_segment in set(russian_segments):  # 去重
            if ru_segment in self.translation_map:
                # 使用已知翻译
                cn_segment = self.translation_map[ru_segment]
                result = result.replace(ru_segment, cn_segment)
                self.stats['matched_texts'] += 1
            else:
                # 调用 API 翻译新文本
                cn_segment = self._translate_with_api(ru_segment)
                if cn_segment and cn_segment != ru_segment:
                    result = result.replace(ru_segment, cn_segment)
                    self.translation_map[ru_segment] = cn_segment  # 缓存结果
                    self.stats['new_texts'] += 1
        
        return result
    
    def _translate_with_api(self, text):
        """使用百度翻译 API 翻译文本"""
        if not self.baidu_app_id or not self.baidu_key:
            return text
        
        self.stats['api_calls'] += 1
        
        import hashlib
        import random
        
        try:
            salt = str(random.randint(32768, 65536))
            sign_str = f"{self.baidu_app_id}{text}{salt}{self.baidu_key}"
            sign = hashlib.md5(sign_str.encode('utf-8')).hexdigest()
            
            url = "https://fanyi-api.baidu.com/api/trans/vip/translate"
            params = {
                'q': text,
                'from': 'ru',
                'to': 'zh',
                'appid': self.baidu_app_id,
                'salt': salt,
                'sign': sign
            }
            
            response = requests.get(url, params=params, timeout=10)
            data = response.json()
            
            if 'trans_result' in data and len(data['trans_result']) > 0:
                return data['trans_result'][0]['dst']
            else:
                print(f"⚠️  API 翻译失败: {data.get('error_msg', '未知错误')}")
                return text
                
        except Exception as e:
            print(f"⚠️  API 请求异常: {e}")
            return text
    
    def _contains_russian(self, text):
        """检查文本是否包含俄语字符"""
        return bool(re.search(r'[\u0400-\u04FF]', text))
    
    def _extract_version_from_assets(self, assets_path):
        """从 .assets 文件中提取版本信息"""
        try:
            env = UnityPy.load(assets_path)
                
            # 遍历所有对象，寻找可能包含版本信息的文本
            for obj in env.objects:
                if obj.type.name in ["TextAsset", "MonoBehaviour", "AssetBundle"]:
                    try:
                        data = obj.read()
                            
                        # 检查各种可能包含版本信息的字段
                        text_fields = []
                            
                        if hasattr(data, 'm_Script') and data.m_Script:
                            text_fields.append(data.m_Script)
                            
                        for attr in ['m_Name', 'name', 'description', 'text', 'title', 'version', 'Version', 'VERSION']:
                            if hasattr(data, attr):
                                value = getattr(data, attr)
                                if value and isinstance(value, str):
                                    text_fields.append(value)
                            
                        # 在文本中查找版本模式
                        for text in text_fields:
                            # 匹配版本模式：数字.数字 或 数字.数字.数字 或 RF4/v数字 等
                            version_patterns = [
                                r'v?(\d+\.\d+(?:\.\d+)?)',  # v1.2.3, 1.2.3, v1.2
                                r'([Rr][Ff]4?[\\/]?v?\d+\.\d+)',  # RF4/v1.2, rf4\1.2
                                r'(\d+\.\d+\.\d+[a-zA-Z]?)',  # 1.2.3a, 1.2.3beta
                            ]
                                
                            for pattern in version_patterns:
                                matches = re.findall(pattern, text)
                                if matches:
                                    # 返回第一个找到的版本号
                                    version = matches[0]
                                    print(f"   版本检测: 在对象 {obj.path_id} 中找到版本 '{version}'")
                                    return version
                                        
                    except Exception as e:
                        continue
                
            # 如果没找到版本信息，使用时间戳
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            print(f"   版本检测: 未找到版本信息，使用时间戳 '{timestamp}'")
            return f"auto_{timestamp}"
                
        except Exception as e:
            print(f"   版本检测: 读取文件时出错 {e}")
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            return f"auto_{timestamp}"
    
    def save_translation_map(self, map_file='translation_map_v2.json'):
        """保存翻译映射表"""
        try:
            with open(map_file, 'w', encoding='utf-8') as f:
                json.dump(self.translation_map, f, ensure_ascii=False, indent=2)
            print(f"💾 翻译映射表已保存: {map_file} ({len(self.translation_map)} 条)")
        except Exception as e:
            print(f"❌ 保存失败: {e}")
    
    def load_translation_map(self, map_file='translation_map_v2.json'):
        """加载翻译映射表"""
        if os.path.exists(map_file):
            try:
                with open(map_file, 'r', encoding='utf-8') as f:
                    loaded_map = json.load(f)
                self.translation_map.update(loaded_map)
                print(f"✅ 加载现有翻译映射: {len(loaded_map)} 条")
            except Exception as e:
                print(f"⚠️  加载映射表失败: {e}")


def main():
    if len(sys.argv) < 4:
        print(__doc__)
        print("错误：需要提供 3 个文件参数")
        print("用法: python scripts/localize_v2.py <俄服基线> <汉化基线> <新俄服文件> [输出文件]")
        sys.exit(1)
    
    base_ru_file = sys.argv[1]
    base_cn_file = sys.argv[2]
    new_ru_file = sys.argv[3]
    output_file = sys.argv[4] if len(sys.argv) > 4 else new_ru_file.replace('.assets', '_cn.assets')
    
    # 验证所有输入文件存在
    for label, path in [("俄服基线", base_ru_file), ("汉化基线", base_cn_file), ("新俄服文件", new_ru_file)]:
        if not os.path.exists(path):
            print(f"❌ {label}文件不存在: {path}")
            sys.exit(1)
    
    print("🎮 RF4 游戏汉化工具 v2.0")
    print("=" * 60)
    print(f"📂 俄服基线: {base_ru_file}")
    print(f"📂 汉化基线: {base_cn_file}")
    print(f"📂 新俄服文件: {new_ru_file}")
    print(f"📤 输出文件: {output_file}")
    
    # 创建汉化器
    localizer = RF4LocalizerV2()
    
    # 加载现有映射表（如果存在）
    localizer.load_translation_map()
    
    # 加载基底模板
    localizer.load_base_templates(base_ru_file, base_cn_file)
    
    # 执行汉化
    localizer.localize_new_assets(new_ru_file, output_file)
    
    # 保存更新后的映射表
    localizer.save_translation_map()
    
    print("\n💡 提示：")
    print("   - 版本信息已保存到 *_version.json 文件")
    print("   - 翻译映射表已更新，下次运行将复用")
    print("   - 可通过版本号追踪汉化历史")


if __name__ == '__main__':
    main()
