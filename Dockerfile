# Node.jsベースイメージを使用
FROM node:16

# 作業ディレクトリを設定
WORKDIR /app

# 必要なファイルをコピー
COPY package.json package-lock.json ./
RUN npm install

COPY . .

# アプリケーションを起動
CMD ["node", "server.js"]

# アプリケーションがポート8080で動作
EXPOSE 8080