import PyPDF2

def extract_text_from_pdf(pdf_path, output_txt_path):
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        text = ""
        for page_num in range(len(reader.pages)):
            page = reader.pages[page_num]
            text += page.extract_text() + "\n"
            
    with open(output_txt_path, 'w', encoding='utf-8') as out_file:
        out_file.write(text)

if __name__ == "__main__":
    pdf_file = "final_PROJECT_grading-factor.pdf"
    txt_file = "pdf_text.txt"
    extract_text_from_pdf(pdf_file, txt_file)
    print("Extraction complete.")
