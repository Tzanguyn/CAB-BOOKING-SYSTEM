import pypdf

reader = pypdf.PdfReader('final_PROJECT_grading-factor.pdf')
text = ""
for page in reader.pages:
    text += page.extract_text() + "\n"

with open('grading_factor.txt', 'w', encoding='utf-8') as f:
    f.write(text)

print("PDF text extracted to grading_factor.txt")
