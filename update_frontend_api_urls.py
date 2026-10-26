import os
import re

frontend_src = os.path.abspath(r"c:\Users\ednak\OneDrive\Desktop\datamangement\www\register_form\dotnet\frontend\src")

def get_rel_api_import(file_path):
    rel = os.path.relpath(os.path.join(frontend_src, "config", "api"), os.path.dirname(file_path))
    rel = rel.replace("\\", "/")
    if not rel.startswith("."):
        rel = "./" + rel
    return rel

modified_files = []

for root, dirs, files in os.walk(frontend_src):
    for f in files:
        if not (f.endswith(".jsx") or f.endswith(".js")):
            continue
        file_path = os.path.join(root, f)
        if file_path.endswith(os.path.join("config", "api.js")):
            continue
        
        with open(file_path, "r", encoding="utf-8") as file:
            content = file.read()
        
        if "http://localhost:8085" not in content:
            continue
        
        rel_import = get_rel_api_import(file_path)
        import_stmt = f"import {{ API_BASE_URL, API_ORIGIN }} from '{rel_import}';"
        
        # Replace 'const API_BASE_URL = 'http://localhost:8085/api';' or 'const API_BASE = 'http://localhost:8085/api';'
        content = re.sub(r"const\s+API_BASE_URL\s*=\s*['\"]http://localhost:8085/api['\"];?", "", content)
        content = re.sub(r"const\s+API_BASE\s*=\s*['\"]http://localhost:8085/api['\"];?", "const API_BASE = API_BASE_URL;", content)
        
        # Replace template literals `http://localhost:8085/api/...`
        content = content.replace("`http://localhost:8085/api/", "`${API_BASE_URL}/")
        content = content.replace("'http://localhost:8085/api/", "`${API_BASE_URL}/")
        content = content.replace('"http://localhost:8085/api/', "`${API_BASE_URL}/")
        content = content.replace("'http://localhost:8085/api'", "API_BASE_URL")
        content = content.replace('"http://localhost:8085/api"', "API_BASE_URL")
        
        # Fix string endings if replaced inside quotes
        content = re.sub(r"\$\{API_BASE_URL\}/([^`'\"\n\r]+)['\"]", r"${API_BASE_URL}/\1`", content)
        
        # Replace any remaining http://localhost:8085
        content = content.replace("`http://localhost:8085/", "`${API_ORIGIN}/")
        content = content.replace("'http://localhost:8085/", "`${API_ORIGIN}/")
        content = content.replace('"http://localhost:8085/', "`${API_ORIGIN}/")
        content = content.replace("'http://localhost:8085'", "API_ORIGIN")
        content = content.replace('"http://localhost:8085"', "API_ORIGIN")
        
        # Ensure import is present if API_BASE_URL or API_ORIGIN is used
        if ("API_BASE_URL" in content or "API_ORIGIN" in content) and "from '" + rel_import + "'" not in content:
            content = import_stmt + "\n" + content
            
        with open(file_path, "w", encoding="utf-8") as file:
            file.write(content)
        modified_files.append(file_path)

print(f"Updated {len(modified_files)} files with dynamic API URLs.")
for m in modified_files:
    print(" -", os.path.relpath(m, frontend_src))
