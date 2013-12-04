## Generate all linear models with one indepedent variable
## and export to a JSON file

require(rjson)
require(nnet)
require(plyr)
require(nortest)
require(entropy)
require(mclust)
require(fmsb)
#require(mvoutlier)

not <- function(f){ return(function(x) !f(x))} # create not(f(x)) = !f(x)

# WARNING this line is specific to only Kanitw's computer
# setwd("~/Dropbox/_Projects/_idl/vis-rec/R")
setwd("~/vizrec/R")

DATASET <- "movies"
# DATASET <- "coffee"
output_path = paste("../data/r-output/",DATASET,"/",sep="")
json <- paste("../data/rows/", DATASET, ".json", sep="")
metajson <- paste("../data/rows/", DATASET, "_meta.json", sep="")

# Create a data frame from json
dataFrameFromJSON = function(json_file){
  json_file <- fromJSON(json_file)
  lapply(json_file, function(x) {
    x[sapply(x, is.null)] <- NA
    unlist(x)
  })
  return(do.call("rbind", lapply(json_file, as.data.frame)))
}

df <- dataFrameFromJSON(paste(readLines(json), collapse=""))
meta_df <- dataFrameFromJSON(paste(readLines(metajson), collapse=""))

names_df <- names(df)
N <- length(df)

cat_ids = which(sapply(df,is.factor))
num_ids = which(sapply(df,not(is.factor)))

## special treatment for each data set
if(DATASET == "movies"){
  ## remove title from the list as it's just the key of the data
  title_index = grep("Title", colnames(df))
  cat_ids = setdiff(cat_ids, c(title_index))
}

num_vars = names_df[num_ids]
cat_vars = names_df[cat_ids]
all_vars = c(num_vars, cat_vars)

if (DATASET == "movies"){
  df[num_vars][df[num_vars] == 0] <- NA
}

#for now, leave vars scaled for use with various packages
#scale all numerical data so it coefficient in the models can be compared
#unscaled_df <- df
#df[,num_ids] <- scale(df[,num_ids])

#TODO do for both null and non-null? callback architecture?
# Section: Rankings 1D
make_rank_1D <- function(colsubset, fn=lillie.test, data=df) {
  rank <- lapply(data[colsubset], function(x) fn(x))
  rank[names(data)[!(names(data) %in% colsubset)]] <- NA
  return(rank)
}

combine_ranks <- function(u,v) {
  ret <- u
  #order of vectors may not be the same, but field names should be
  ret[names(u[is.na(u)])] <- v[names(u[is.na(u)])]
  return(ret)
}

clust_error <- function(x) {
  opt_centers = dim(Mclust(as.matrix(x[!is.na(x)]), G=1:20)$z)[2]
  clust = kmeans(x[!is.na(x)], centers = opt_centers, nstart = 25)
  return(clust$betweenss/clust$totss)
}

output_ranks <- function(rank_names, rank_data, filename) {
  rank_list <- list(names = rank_names, data = rank_data)
  sink(paste(output_path, filename, sep=""))
  cat(toJSON(rank_list))
  sink()
}

normality <- make_rank_1D(num_vars, fn=function(x) lillie.test(x)$statistic)
rankdf <- data.frame(normality)
ranks <- c("Normality")

cat_entropy <- make_rank_1D(c(cat_vars, "Title"), fn=function(x) entropy(table(x))/log(length(table(x))))
num_entropy <- make_rank_1D(num_vars, fn=function(x) entropy(table(cut(x, breaks=20)))/log(20))
rankdf <- rbind(rankdf, combine_ranks(num_entropy, cat_entropy))
ranks <- c(ranks, "Normalized Entropy")

num_clusters <- make_rank_1D(num_vars, fn=function(x) dim(Mclust(as.matrix(x[!is.na(x)]), G=1:20)$z)[2])
rankdf <- rbind(rankdf, num_clusters)
ranks <- c(ranks, "Number of Clusters")

clustering_error <- make_rank_1D(num_vars, fn=function(x) clust_error(x))
rankdf <- rbind(rankdf, clustering_error)
ranks <- c(ranks, "Percent Variance Explained Clustering")

#by 1.5xIQR (apparently)
outliers <- make_rank_1D(num_vars, fn=function(x) length(x[x %in% boxplot.stats(x)$out]))
rankdf <- rbind(rankdf, outliers)
ranks <- c(ranks, "Number of Outliers")

#output_ranks(ranks, rankdf, "1D_rankings.json")

#### END OF 1D #####

## get "y ~ X_1 + X_2 + ..."
## also remove y from X
get_linear_formula <- function(y, X) {
  return(paste(y, "~", paste(X[X!=y], collapse= " + ")))
}

# get dependent variable string from simple formula
dep <- function(form) {
  return(strsplit(form[[1]], " ~ ")[[1]][1])
}

# get independent variable string from simple formula
ind <- function(form) {
  return(strsplit(form[[1]], " ~ ")[[1]][2])
}

## Get Linear Formulae with one independent variable
get_simple_linear_formulae <- function(y, Xs) lapply(
  Xs[Xs!=y], function(X) get_linear_formula(y,X)
)

## Get All Simple Linear Formulae with given Y and Xs
get_all_simple_linear_formulae <- function(Y,Xs) sapply(
  Y, function(y) get_simple_linear_formulae(y,Xs)
)

# Get set of {\forall y \in Y | "y ~ sum_{x≠y} x"}
get_all_long_linear_formulae <- function(Y, X) sapply(
  Y, function(y) get_linear_formula(y, X)
)

#export all results of a given formula to a file name
export_json <- function(summaries, filename){
  attr <- c("fstatistic","r.squared", "df")
  coef_colnames <- colnames(summaries[[1]]$coefficients)

  to_export <- lapply(summaries, function(s){
    #put all attribute in ex_s
    ex_s = sapply(attr, function(a) s[a], USE.NAMES=F)
    #then convert coefficient table to nested list format (for JSON export)
    ex_s$coefs <- sapply(coef_colnames, function(col) list(s$coefficients[,col]), USE.NAMES=T)
    return(ex_s)
  })

  sink(paste(output_path, filename,sep=""))
  cat(toJSON(to_export))
  sink() #"close file"
}

run_and_sum_all <- function(formulae, fn=lm, ...){
  names(formulae) <- formulae
  return(lapply(formulae, function(f) summary(fn(formula=f, data=df, ...))) )
}

simple_num_num = get_all_simple_linear_formulae(num_vars, num_vars)
#long_num_num = get_all_long_linear_formulae(num_vars,num_vars)

#sum_simple_num_num = run_and_sum_all(simple_num_num)
#sum_long_num_num = run_and_sum_all(long_num_num)

#export_json(sum_simple_num_num, "simple_linear.json")
#export_json(sum_long_num_num, "long_linear.json")



## ANALYSIS OF SIMPLE NUM ~ NUM
#function analyse_simple_num_num(sum_simple_num_num){
#  estimate <- sapply(sum_simple_num_num, function(s) s$coefficients[1,2])
#  s_estimate <- estimate[sort.list(estimate, decreasing=T)]
#}
#
## ANALYSIS OF LONG NUM ~ NUM
#function analyse_long_num_num(sum_long_num_num){
#
#  estimate <- lapply(sum_long_num_num, function(s) s$coefficients[,1])
#  max_estimate <- apply(estimate, 2, max)
#  s_estimate <- estimate[sort.list(estimate, decreasing=T)]
#  head(s_estimate)
#
#  ## recreate table with NA values (since the extracted estimates
#  ## won't include depedent variable in coefficients.
#  est_table <- sapply(c("(Intercept)",num_vars), function(var) lapply(
#    1:length(estimate), function(i) estimate[[i]][var], USE.NAMES=T)
#  )
#  names(est_table) <- c("(Intercept)",num_vars)  ## assign the right name for each variable
#  ## write to table so we can easily
#  write.table(est_table, paste(output_path,"/est.tsv",sep=""), sep="\t", col.names=NA)
#}

### ANALYSIS OF NUM ~ ALL  (ALL = Both Cat, Num)
#simple_num_all = get_all_simple_linear_formulae(num_vars, all_vars)
#long_num_all = get_all_long_linear_formulae(num_vars, all_vars)

#sum_simple_num_all = run_and_sum_all(simple_num_all)
#sum_long_num_all = run_and_sum_all(long_num_all)

#export_json(sum_simple_num_all, "simple_linear_all.json")
#export_json(sum_long_num_all, "long_linear_all.json")


# copied from above but still haven't make good use of it.

#function analyse_long_num_all(sum_long_num_all){
#   estimate <- lapply(sum_long_num_all, function(s) s$coefficients[,1])
#   max_estimate <- apply(estimate, 2, max)
#   s_estimate <- estimate[sort.list(estimate, decreasing=T)]
#   head(s_estimate)
#
#   ## recreate table with NA values (since the extracted estimates
#   ## won't include depedent variable in coefficients.
#   est_table <- sapply(c("(Intercept)",num_vars), function(var) lapply(
#     1:length(estimate), function(i) estimate[[i]][var], USE.NAMES=T)
#   )
#   names(est_table) <- c("(Intercept)",num_vars) ## assign the right name for each variable
#   ## write to table so we can easily
#   write.table(est_table, paste(output_path,"/sum_long_num_all.tsv",sep=""), sep="\t", col.names=NA)
#}


## ANALYSIS OF CAT ~ NUM
#still have some bugs below
simple_cat_num = get_all_simple_linear_formulae(cat_vars, num_vars)
#sum_simple_cat_num = run_and_sum_all(simple_cat_num, fn=multinom)

#models_simple_cat_num = list()
#for(i in 1:length(simple_cat_num)){
#  cat(i)
#  models_simple_cat_num[i]<- multinom(formula=simple_cat_num[[i]],data=df)
#}

#summary(multinom(formula=simple_cat_num[[1]],data=df))

# long_cat_num = get_all_long_linear_formulae(cat_vars, num_vars)
#sum_simple_num_num = run_and_sumall(simple_num_num, fn=glm, family=binomial())
# sum_long_num_num = run_and_sum_all(long_num_num, fn=glm)

# 2D Rankings - Jeff

simple_cat_cat = get_all_simple_linear_formulae(cat_vars, cat_vars)
simple_num_cat = get_all_simple_linear_formulae(num_vars, cat_vars)
all_simple_formulae = get_all_simple_linear_formulae(names(df), names(df))

make_rank_2D <- function(formulae, fn=rank_R2) {
  names(formulae) <- formulae
  rank <- lapply(formulae, function(x) fn(x))
  rank[unlist(all_simple_formulae[!(all_simple_formulae %in% formulae)])] <- NA
  return(rank)
}

rank_R2 <- function(formula) {
  return(summary(lm(formula, data=df))$adj.r.squared)
}

nnr2 <- make_rank_2D(c(simple_num_num, simple_num_cat), fn=rank_R2)
rank2df <- data.frame(nnr2)
rank2s <- c("R-Squared")

rank_pseudo_R2 <- function(formula) {
  return(NagelkerkeR2(glm(formula, data=df, family=binomial)))
}

pseudor2 <- make_rank_2D(c(simple_cat_num, simple_cat_cat), fn=rank_pseudo_R2)
rank2df <- rbind(rank2df, pseudor2)
rank2s <- c("Pseudo R-Squared")

rank_aic <- function(formula) {
  return(summary(glm(formula, data=df, family=binomial))$aic)
}

aic <- make_rank_2D(c(simple_cat_num, simple_cat_cat), fn=rank_aic)
rank2df <- rbind(rank2df, aic)
rank2s <- c("Logistic Reg. AIC")

output_ranks(rank2s, rank2df, "2D_rankings.json")