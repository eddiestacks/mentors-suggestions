module.exports = {
  calcTF: function(termFrequencyHash, currentTerm, index, array) {
    if (!(currentTerm in termFrequencyHash)) {
      termFrequencyHash[currentTerm] = 1;
      // termFrequencyHash[currentTerm] = 1 / array.length;
    } else {
      termFrequencyHash[currentTerm] += 1;
      // termFrequencyHash[currentTerm] += 1 / array.length;
    }
    return termFrequencyHash;
  },
  tf: function(words) {
    return words.reduce(this.calcTF, {});
  },
  df: function(words,context) {
    // Generate promises for all keywords and store them in dfPromises
    var dfPromises = [];
    _.each(words, function(word, index, words) {
      dfPromises[index] = this.dfPromise(word,context);
    }, this);
    // Evaluate all done 
    // $.when()
  },
  dfPromise: function(word, context) {
    // var promise = context();
    return context.ajax("requestDF", word);
  },
  // documentFrequency is the number of articles the term is found in
  // todo: test inverted document frequency method method (2)
  idf: function(documentFrequency) {
    // totalArticleCount is the number of unique documents in KB
    // todo: Remove hardcoded articleCount and pull on app load (3)
    // Hardcoded based on api results: 17,018 as of 8/26/2014
    var totalArticleCount = 17018;
    return Math.log(totalArticleCount / documentFrequency) / Math.log(10);
    // return Math.log(totalArticleCount / (1 + documentFrequency)) / Math.log(10);
  },
  tfidf: function(term, description) {
    var termFrequency = tf(words);
    var tf = termFrequency[term];
    var df = requestDF(term);
    var idf = idf(df);
    return tf * idf;

  },
  // Returns an JSON object containing tf, idf and tf*idf
  // Todo: (4) the tfidf analyze method must return tfidf for each of the words in the array
  tfidfAnalyze: function(words) {
    // return an json object with each word as a key with tf, idf and tf*idf
    var termFeatures = {};
    //    Calculate tf
    var termFrequency = tf(words);
    // for each term in calculate tf*idf
    _.each(termFrequency, function(tf, term, termFrequency) {
      // Store tf into termFeatures object
      termFeatures[term]["tf"] = tf;
      //    Calculate df from the Search API
      termFeatures[term]["df"] = requestDF(term);
      //    Calculate idf
      termFeatures[term]["idf"] = idf(termFeatures[term]["documentFrequency"]);
      // var invertedDocumentFrequency;
      //    Calculate tf*idf
      termFeatures[term]["tfidf"] = termFeatures[term]["tf"] * termFeatures[term]["idf"];
    });
    return termFeatures;

  }

};
