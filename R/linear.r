require(rjson)
require(plyr)

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

# nominal_indices = which(meta_df$type=="nominal")
# numeric_indices = which(meta_df$type=="numeric")

non_numeric_indices = which(sapply(df,is.factor))
numeric_indices = which(sapply(df,not(is.factor)))

N <- length(df)

# get formula X_i ~ X_1 + ...+ X_{i-1} + X_{i+1}+ ... X_n
get_long_linear_formula <- function(i){
  # get {1:N} - {1}
  x_indices = setdiff(numeric_indices,c(i)) 
#   print(paste(c("x_id",x_indices)))
  x_names <- names(df)[x_indices]
  f <- as.formula(paste(names(df)[i], " ~ ", paste(x_names, collapse=" + ")))
  print(paste(i,",",N,":"))
#   print(f)
  return (f)
}

# get a collection of formula {X_i ~ X_j | j≠i \forall j ∈ 1:N }
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

# Test a simple formula from one i
# i = which(df_names=="US.Gross")
# simple_formulas = get_simple_linear_formulas(i)
# rs = lm(as.formula(simple_formulas[1]),df)
# summary(rs)

# Test all formulas from one i 
# i = which(df_names=="US.Gross")
# simple_formulas = get_simple_linear_formulas(i)
# lapply(simple_formulas, function(formula){
#   rs = lm(as.formula(formula),df)
#   return (summary(rs))
# })

#run all of these on numeric indices

lapply(numeric_indices, function(i){
  simple_formulas = get_simple_linear_formulas(i)
  return (lapply(simple_formulas, function(formula){
    rs = lm(as.formula(formula),df)
    return (summary(rs))
  }))
})

for(i in 1:N){
  simple_formulas = get_simple_linear_formulas(i)
  for(formula in simple_formulas){
    rs = lm(as.formula(simple_formulas[1]),df)
    summary(rs)  
  }
  
}

formulae <- lapply(numeric_indices, get_formula)
results <- lapply(formulae, function(x){
  lm(x, df)
})
