#!/usr/bin/env python3
"""
从已汉化的 resources.assets 文件中提取俄文→中文翻译对照表

用法：
  python scripts/extract_translation_map.py <汉化文件路径> [输出JSON路径]

示例：
  python scripts/extract_translation_map.py "C:\Users\book\Desktop\汉化\汉化文件\resources.assets"
  python scripts/extract_translation_map.py resources_cn.assets translation_map.json
"""

import sys
import os
import re
import json

try:
    import UnityPy
except ImportError:
    print("❌ 缺少依赖库 UnityPy")
    print("请运行: pip install UnityPy")
    sys.exit(1)


def extract_translations_from_assets(assets_path):
    """从 .assets 文件中提取所有文本并尝试匹配俄文→中文对"""
    print(f"📂 正在读取: {assets_path}")
    
    env = UnityPy.load(assets_path)
    translation_map = {}
    processed_objects = 0
    
    # 收集所有文本对象
    text_objects = []
    
    for obj in env.objects:
        if obj.type.name in ["TextAsset", "MonoBehaviour"]:
            try:
                data = obj.read()
                
                # 提取各种可能的文本字段
                texts_to_check = []
                
                if hasattr(data, 'm_Script') and data.m_Script:
                    texts_to_check.append(('m_Script', data.m_Script))
                
                for attr in ['m_Name', 'name', 'description', 'text', 'title', 'displayName']:
                    if hasattr(data, attr):
                        value = getattr(data, attr)
                        if value and isinstance(value, str) and len(value.strip()) > 0:
                            texts_to_check.append((attr, value))
                
                text_objects.append({
                    'path_id': obj.path_id,
                    'type': obj.type.name,
                    'texts': texts_to_check
                })
                
                processed_objects += 1
                if processed_objects % 5000 == 0:
                    print(f"  已扫描 {processed_objects} 个对象...")
                    
            except Exception as e:
                continue
    
    print(f"✅ 共扫描 {processed_objects} 个对象，找到 {len(text_objects)} 个包含文本的对象")
    
    # 尝试从文本内容中提取俄文→中文对
    print("⏳ 正在提取翻译对照...")
    
    for obj_info in text_objects:
        for field_name, text_content in obj_info['texts']:
            # 在同一个文本块中寻找俄文和中文
            russian_texts = re.findall(r'[\u0400-\u04FF]{2,}', text_content)
            chinese_texts = re.findall(r'[\u4e00-\u9fff]{2,}', text_content)
            
            # 如果同时包含俄文和中文，尝试建立映射
            if russian_texts and chinese_texts:
                # 简单策略：按出现顺序配对
                for ru_text in set(russian_texts):
                    # 查找该俄文附近的中文
                    ru_pos = text_content.find(ru_text)
                    if ru_pos != -1:
                        # 在前后范围内寻找中文
                        search_range = 200  # 搜索范围（字符）
                        start_search = max(0, ru_pos - search_range)
                        end_search = min(len(text_content), ru_pos + len(ru_text) + search_range)
                        context = text_content[start_search:end_search]
                        
                        # 提取上下文中的中文
                        chinese_in_context = re.findall(r'[\u4e00-\u9fff]{2,}', context)
                        
                        # 选择最接近的中文作为翻译
                        if chinese_in_context:
                            # 找到距离俄文最近的中文
                            closest_cn = None
                            min_distance = float('inf')
                            
                            for cn_text in chinese_in_context:
                                cn_pos = context.find(cn_text)
                                distance = abs(cn_pos - (ru_pos - start_search))
                                if distance < min_distance:
                                    min_distance = distance
                                    closest_cn = cn_text
                            
                            if closest_cn and len(closest_cn) >= 2:
                                # 避免过短的文本（可能是标点或误识别）
                                if len(ru_text) >= 2:
                                    translation_map[ru_text] = closest_cn
    
    print(f"✅ 提取完成！共找到 {len(translation_map)} 条俄文→中文对照")
    
    return translation_map


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'translation_map.json'
    
    if not os.path.exists(input_file):
        print(f"❌ 文件不存在: {input_file}")
        sys.exit(1)
    
    print("🎮 RF4 翻译对照表提取工具")
    print("=" * 60)
    
    # 提取翻译对照
    translation_map = extract_translations_from_assets(input_file)
    
    # 保存到 JSON 文件
    print(f"\n💾 正在保存翻译对照表: {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(translation_map, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 保存完成！")
    print(f"   文件: {output_file}")
    print(f"   条目数: {len(translation_map)}")
    print(f"   文件大小: {os.path.getsize(output_file) / 1024:.1f} KB")
    
    # 显示一些示例
    print(f"\n📋 翻译对照示例（前10条）:")
    for i, (ru, cn) in enumerate(list(translation_map.items())[:10]):
        print(f"  {i+1}. 俄文: {ru[:50]}{'...' if len(ru) > 50 else ''}")
        print(f"     中文: {cn}")
        print()


if __name__ == '__main__':
    main()
