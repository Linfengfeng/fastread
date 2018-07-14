'use strict';

const jwt = require('../middleware/jwt');
const BookModel = require('../model/book');
const fs = require('fs');
const config = require('../config');

const list = async ctx => {
  let page = ctx.query.page || 1;
  let limit = Number(ctx.query.limit) || 10;
  let skip = (page - 1) * limit;

  let books = await BookModel.find()
    .skip(skip)
    .limit(limit)
    .exec();
  ctx.body = books;
};

const getBookByLevel = async ctx => {
  let books = await BookModel.find({
    level: ctx.params.level
  })
    .select({
      segments: 0
    })
    .exec();
  ctx.body = books;
};
const getInfoById = async (ctx) => {
    let bookInfo = await BookModel.findById(ctx.params.id)
        .populate({
            path: 'segments',
            select: {
                "content":0,
                "name":0,
                "level":0,
                "words":0,
                "created":0,
                "updated":0,
                "comments":0,
                "commentNum":0
            }
        }) 
    let tmp = [];
    for(let i of bookInfo.segments){
        tmp.push(i['_id']);
    }
    bookInfo.segments = tmp;    
    ctx.body = bookInfo;
}

const create = async ctx => {
  let bookModel = ctx.request.body;
  try {
    let book = await new BookModel(bookModel).save();

    ctx.status = 200;
    ctx.body = { _id: book._id };
  } catch (error) {
    ctx.status = 403;
    // TODO: error code
    ctx.body = { error: 'error' };
  }
};

const updateInfo = async ctx => {
  let bookId = ctx.params.book;
  let book = await BookModel.findByIdAndUpdate(bookId, ctx.request.body);
  ctx.status = 200;
  ctx.body = {};
};

const like = async ctx => {
  let book = await BookModel.findById(ctx.request.body.id).exec();
  let token = jwt.getToken(ctx);
  let userId = token.id;
  let alreadyLiked = false;
  for (let i = 0; i < book.likes.length; i++) {
    if (String(book.likes[i]) === userId) {
      alreadyLiked = true;
      book.likes.splice(i, 1);
      break;
    }
  }
  if (!alreadyLiked) {
    book.likes.push(userId);
  }
  book.likeNum = book.likes.length;

  let updatedBook = await book.save();

  ctx.status = 200;
  ctx.body = {};
};

const uploadCover = async ctx => {
  ctx.req.part.pipe(
    fs.createWriteStream(config.cover_path + ctx.params.id + '.jpg')
  );

  ctx.status = 200;
  ctx.body = {};
};
const recommandByLevel = async(ctx)=>{
        let page = ctx.query.page || 1;
        let limit = Number(ctx.query.limit) || 10;
        let skip = (page - 1) * limit;
        let level = Number( ctx.query.level)||10;
        let pattern = Number(ctx.query.pattern);
        let sortWay = Number(ctx.query.sortway)||-1;//default:descending order
        console.log(ctx.query);
        let books = await BookModel.find({"level":{$lte:level}}).sort({pattern:sortWay}).skip(skip).limit(limit).exec();
        ctx.body = books;
}

cconst search = async(ctx)=>{
    let page = ctx.query.page || 1;
    let limit = Number(ctx.query.limit) || 10;
    let skip = (page - 1) * limit;
    let searchQuery = ctx.query.search;
    let res1=await BookModel.find({"bookname":{$regex:searchQuery,"$options":"i"}})
    console.log(res1)
    searchQuery=searchQuery.trim().split(/\s+/)
    console.log(searchQuery);
    let res=[];
    for(let item of searchQuery){
        res.push(await BookModel.find({$or:[{"bookname":{$regex:item,"$options":'i'}},{"author":{$regex:item,"$options":'i'}}]}).skip(skip).limit(limit).exec()); 
    }
    let tmp =[];
    let vote = [];
    for(let i = 0 ; i < res.length ; i++){
        for (let j = 0 ; j < res[i].length ;j++){
            let temp = res[i][j]["bookname"];
            let judge = false;
            for(let k = 0;k<tmp.length; k++){
                if(tmp[k]["bookname"]==temp){
                    vote[k]+=1;
                    judge =true;
                }
            }
            if(!judge){
                tmp.push(res[i][j]);
                vote.push(1);
            }        
        }
    }
    let maxIndex;
    for(let i=0;i<tmp.length-1;i++){
        maxIndex = i;
        for(let j = i+1;j<tmp.length;j++){
            if(tmp[j]>tmp[maxIndex]){
                maxIndex = j;
            }
        }
        let temp = tmp[i];
        tmp[i]=tmp[maxIndex];
        tmp[maxIndex]=temp;
    }
    ctx.body=tmp;
    ctx.status=200;
};
const GetCommentNum = async(ctx)=>{
    let book = await BookModel.findById(ctx.params.bookid);
    let newlength = book.comments.length;
    await BookModel.update({"_id":ctx.params.bookid},{$set:{"CommentNum":newlength}})
    ctx.status=200;
}


module.exports.securedRouters = {
  'POST /book/like': like
};

module.exports.routers = {
  'GET /GetTotalCommentNum/:bookid':GetCommentNum,
  'GET /recommandByLevel':recommandByLevel,
  'GET /book': list,
  'GET /book/:id': getInfoById,
  'POST /book': create,
  'GET /getBookByLevel/:level': getBookByLevel,
  'PUT /book/:book': updateInfo,
  'GET /search':search,
  'POST /uploadCover/:id': uploadCover
};
