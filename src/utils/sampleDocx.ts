import JSZip from 'jszip';

export async function generateSampleLaborContractDocx(): Promise<string> {
  const zip = new JSZip();

  // 1. [Content_Types].xml
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );

  // 2. _rels/.rels
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  // 3. word/document.xml
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="24"/>
        </w:rPr>
        <w:t>Độc lập - Tự do - Hạnh phúc</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:t>------------------------o0o------------------------</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="32"/>
          <w:color w:val="1E40AF"/>
        </w:rPr>
        <w:t>HỢP ĐỒNG LAO ĐỘNG</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:i/>
          <w:sz w:val="20"/>
          <w:color w:val="64748B"/>
        </w:rPr>
        <w:t>Số: 01/2026/HĐLĐ-MYFILE</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r>
        <w:rPr>
          <w:i/>
        </w:rPr>
        <w:t>- Căn cứ Bộ luật Lao động số 45/2019/QH14 ngày 20/11/2019;</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr>
          <w:i/>
        </w:rPr>
        <w:t>- Căn cứ nhu cầu và năng lực của hai bên,</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="24"/>
        </w:rPr>
        <w:t>Hôm nay, ngày 01 tháng 01 năm 2026, chúng tôi gồm có:</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:color w:val="1E3A8A"/>
        </w:rPr>
        <w:t>BÊN A - NGƯỜI SỬ DỤNG LAO ĐỘNG:</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>• Công ty: CÔNG TY CỔ PHẦN CÔNG NGHỆ VÀ DỊCH VỤ SỐ MYFILE</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>• Đại diện bởi: Ông HOÀNG DÂN - Chức vụ: Giám đốc Điều hành</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>• Địa chỉ: Tòa nhà Bitexco Financial Tower, Quận 1, TP. Hồ Chí Minh</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>• Điện thoại: (028) 3888 9999 - Email: hoangdan.xnk@gmail.com</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:color w:val="1E3A8A"/>
        </w:rPr>
        <w:t>BÊN B - NGƯỜI LAO ĐỘNG:</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>• Họ và tên: NGUYỄN VĂN AN</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>• Sinh ngày: 15/08/1995 - Quốc tịch: Việt Nam</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>• Số CCCD: 079095012345 cấp ngày 10/05/2023 tại Cục CSQLHC về TTXH</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>• Địa chỉ thường trú: 123 Đường Điện Biên Phủ, Phường Đa Kao, Quận 1, TP.HCM</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r>
        <w:rPr>
          <w:b/>
        </w:rPr>
        <w:t>Hai bên cùng thống nhất ký kết Hợp đồng lao động với các điều khoản sau:</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r>
        <w:rPr>
          <w:b/>
        </w:rPr>
        <w:t>Điều 1: Vị trí công việc, thời hạn và địa điểm làm việc</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>1. Loại hợp đồng: Hợp đồng lao động xác định thời hạn 24 tháng (từ 01/01/2026 đến 31/12/2027).</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>2. Vị trí chuyên môn: Kỹ sư Phần mềm Cao cấp / Trưởng nhóm Phát triển Hệ thống.</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>3. Địa điểm làm việc: Văn phòng công ty và làm việc linh hoạt kết hợp từ xa (Hybrid).</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r>
        <w:rPr>
          <w:b/>
        </w:rPr>
        <w:t>Điều 2: Tiền lương, phụ cấp và chế độ đãi ngộ</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>1. Mức lương cơ bản: 35.000.000 VNĐ / tháng (Ba mươi lăm triệu đồng chẵn).</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>2. Phụ cấp trách nhiệm và dự án: 5.000.000 VNĐ / tháng.</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>3. Hình thức trả lương: Chuyển khoản ngân hàng vào ngày 05 hàng tháng.</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>4. BHXH, BHYT, BHTN: Công ty đóng đầy đủ theo quy định của pháp luật Việt Nam.</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r>
        <w:rPr>
          <w:b/>
        </w:rPr>
        <w:t>Điều 3: Quyền và nghĩa vụ của người lao động</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>- Thực hiện đầy đủ và nghiêm túc các công việc được giao theo bản mô tả công việc.</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>- Tuân thủ quy định bảo mật thông tin tài liệu, mã nguồn và dữ liệu khách hàng.</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r>
        <w:rPr>
          <w:b/>
        </w:rPr>
        <w:t>Điều 4: Điều khoản thi hành</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Hợp đồng này được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản để thực hiện.</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p/>
    <w:p>
      <w:pPr>
        <w:jc w:val="both"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
        </w:rPr>
        <w:t>ĐẠI DIỆN BÊN A                                                                 ĐẠI DIỆN BÊN B</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr>
          <w:i/>
        </w:rPr>
        <w:t>(Ký, đóng dấu và ghi rõ họ tên)                                      (Ký và ghi rõ họ tên)</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;

  zip.file('word/document.xml', documentXml);

  const base64 = await zip.generateAsync({ type: 'base64' });
  return `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`;
}
