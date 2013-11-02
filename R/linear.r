## Generate all linear models with one indepedent variable
## and export to a JSON file

require(rjson)
require(plyr)

# WARNING this line is specific to only Kanitw's computer
setwd("~/Dropbox/_Projects/_idl/vis-rec/R")

json <- "../data/rows/movies.json"
metajson <- "../data/rows/movies_meta.json"

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

## kanitw: these two lines somehow doesn't work 
# nominal_indices = which(meta_df$type=="nominal")
# numeric_indices = which(meta_df$type=="numeric")

non_numeric_indices = which(sapply(df,is.factor))
numeric_indices = which(sapply(df,not(is.factor)))

#scale all numerical data so it makes sense
lapply(numeric_indices, function(i){ df[i] = scale(df[i]) })

N <- length(df)

## get formula X_i ~ X_1 + ...+ X_{i-1} + X_{i+1}+ ... X_n
get_long_linear_formula <- function(i){
  ## get {1:N} - {1}
  x_indices = setdiff(numeric_indices,c(i)) 
#   print(paste(c("x_id",x_indices)))
  x_names <- names(df)[x_indices]
  f <- as.formula(paste(names(df)[i], " ~ ", paste(x_names, collapse=" + ")))
  print(paste(i,",",N,":"))
#   print(f)
  return (f)
}

## get a collection of formula {X_i ~ X_j | j≠i \forall j ∈ 1:N }
get_simple_linear_formulas <- function(i){
  formulas <- c()
  x_indices = setdiff(numeric_indices,c(i)) 
  #cat(x_indices)
  for (j in x_indices){
    if(j !=i){
      f <- paste(names(df)[i], " ~ ", paste(names(df)[j]))
      print(paste(j,f))
      formulas <- c(formulas, f)
    }
  }
  return(formulas)
}

## Test a simple formula from one i
# i = which(df_names=="US.Gross")
# simple_formulas = get_simple_linear_formulas(i)
# rs = lm(as.formula(simple_formulas[1]),df)
# summary(rs)

## Test all formulas from one i 
# i = which(df_names=="US.Gross")
# simple_formulas = get_simple_linear_formulas(i)
# lapply(simple_formulas, function(formula){
#   rs = lm(as.formula(formula),df)
#   return (summary(rs))
# })

## run all of these on each numeric index

formulae_matrix <- lapply(numeric_indices, get_simple_linear_formulas)
formulae <- unlist(formulae_matrix)
names(formulae) <- formulae

summaries <- lapply(formulae, function(f){return(summary(lm(f, data=df)))}) 

#coeffs <- lapply(summaries, coef)
## export each coefficient table to tsv files
# path <- "../data/r-output/movies/"
# mapply(function(name,s){
#   cat(names(s))
# #   write.table(coef(s),paste0(path,"coeff_",gsub("~","--",name),".tsv"),sep="\t", col.names=NA)
# }, names(summaries),summaries)
# 
# attrs <- c("fstatistic","r.squared")

## export all of these to one json file

to_export <- list()
to_export$coef_colnames <- colnames(summaries[[1]]$coefficients)
to_export$coef_rownames <- lapply(summaries, function(s) rownames(s$coefficients))
to_export$coefs <- lapply(summaries, function(s) s$coefficients)
to_export$fstats <- lapply(summaries, function(s) s$fstatistic)
to_export$r.squared <- lapply(summaries, function(s) s$r.squared)
to_export$df <- lapply(summaries, function(s) s$df)

sink(paste(path,"simple_linear.json",sep=""))
cat(toJSON(to_export))
sink() #"close file"
# 
# mapply(function(name, s){
#   cat(name)
#   mapply(function())
#   write.table(coef(s),paste0(path,"coeff_",name,".tsv"),sep="\t")
# },names(summaries), summaries)
