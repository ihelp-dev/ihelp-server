#!/bin/bash
ROOT_DIR=$(pwd)
for lambda in $(ls ${ROOT_DIR}/lambda/src)
do
  cd lambda/src/${lambda}
  npm set init.author.email "covid.ihelp@gmail.com"
  npm set init.author.name "Covid Ihelp"
  npm install .
  cd ${ROOT_DIR}
done