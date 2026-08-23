#!/bin/bash

# Chạy backend để làm việc local
if [ "$1" == "--dev" ]; then
    echo "Đang chạy chế độ phát triển..."
    npm start
else
    # Nếu muốn cập nhật giao diện frontend vào docs để up lên GitHub
    echo "Đang đồng bộ giao diện frontend vào docs để deploy GitHub Pages..."
    cp -r frontend/* docs/
    # Nếu có file index.htm (Next.js cũ) thì đổi tên thành index.html cho GitHub hiểu
    if [ -f "docs/index.htm" ]; then
        mv docs/index.htm docs/index.html
    fi
    echo "Đã cập nhật thư mục docs/. Hãy git commit và push để thay đổi web GitHub."
fi
