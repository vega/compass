## Generate all linear models with one indepedent variable
## and export to a JSON file

require(rjson)
require(plyr)

# WARNING this line is specific to only Kanitw's computer
setwd("~/Dropbox/_Projects/_idl/vis-rec/R")

DATASET <- "movies"
output_path = paste("../data/r-output/",DATASET,"/",sep="")
# DATASET <- "coffee"

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

not <- function(f){ return(function(x) !f(x))} # create not(f(x)) = !f(x)

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


##scale all numerical data so it coefficient in the models can be compared
l_ply(num_ids, function(i){ df[i] <- scale(df[i]) })


## get "y ~ X_1 + X_2 + ..."
## also remove y from X
get_linear_formula <- function(y, X) paste(
  y, "~", paste(X[X!=y], collapse= " + ")
)

## Get Linear Formulae with one independent variable
get_simple_linear_formulae <- function(y, Xs) lapply(
  Xs[Xs!=y], function(X) get_linear_formula(y,X)
)

## Get All Simple Linear Formulae with given Y and Xs
get_all_simple_linear_formulae <- function(Y,Xs) unlist(
  lapply(Y, function(y) get_simple_linear_formulae(y,Xs))
)

# Get set of {\forall y \in Y | "y ~ sum_{x≠y} x"}
get_all_long_linear_formulae <- function(Y, X) unlist(
  lapply(Y, function(y) get_linear_formula(y, X))
)

#export all results of a given formula to a file name
export_json <- function(summaries, filename){
  attr <- c("fstatistic","r.squared", "df")
  coef_colnames <- colnames(summaries[[1]]$coefficients)
  
  to_export <- lapply(summaries, function(s){
    #put all attribute in ex_s
    ex_s = sapply(attr, function(a) s[a], USE.NAMES=TRUE) 
    #then convert coefficient table to nested list format (for JSON export)
    ex_s$coefs <- sapply(coef_colnames, function(col) list(s$coefficients[,col]), USE.NAMES=T) 
    return(ex_s)
  })
  
  sink(paste(output_path, filename,sep=""))
  cat(toJSON(to_export))
  sink() #"close file"  
}

run_and_sum_all <- function(formulae, fn=lm){
  names(formulae) <- formulae
  return(lapply(formulae, function(f) summary(fn(f, data=df))) )
}

simple_num_num = get_all_simple_linear_formulae(num_vars, num_vars)
long_num_num = get_all_long_linear_formulae(num_vars,num_vars)

sum_simple_num_num = run_and_sum_all(simple_num_num)
sum_long_num_num = run_and_sum_all(long_num_num)

export_json(sum_simple_num_num, "simple_linear.json")
export_json(sum_long_num_num, "long_linear.json")