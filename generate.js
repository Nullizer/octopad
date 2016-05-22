#!/usr/bin/env node

const fs          = require('fs')
const path        = require('path')
const util        = require('util')
const asciidoctor = require('asciidoctor.js')()
const opal        = asciidoctor.Opal
const nunjucks    = require('nunjucks')

const processor = asciidoctor.Asciidoctor()
const asciidoctor_options = opal.hash({doctype: 'book', attributes: ['showtitle']})

nunjucks.configure({ autoescape: false })

const source_dir = './source'
const public_dir = './public'
const posts_dir  = path.join(source_dir, 'posts')

class File {
  constructor(filepath) {
    this.stats = fs.lstatSync(filepath)
    this.absolutePath = path.resolve(filepath)
    this.parsed = path.parse(filepath)
    this.filename = this.parsed.base
    this.name = this.parsed.name
    this.extname = this.parsed.ext
  }
}

class Post {
  constructor(filepath, layout = path.resolve(source_dir, 'layouts/post.njk')) {
    this.sourceFile = new File(filepath)
    this.layout = layout
  }

  get contentReader() {
    return new Promise((resolve, reject) => {
      fs.readFile(this.sourceFile.absolutePath, 'utf8', (err, content) => {
        if (err) {
          console.error(err)
          reject(err)
        }
        resolve(content)
      })
    })
  }

  get renderedStringReader() {
    return this.contentReader.then(r => {
      const html = processor.$convert(r, asciidoctor_options)
      const result = nunjucks.render(this.layout, { content: html })
      return result
    })
  }

  render(output_dir = public_dir) {
    return this.renderedStringReader.then(result => {
      const outputfilename = this.sourceFile.filename.replace('.adoc', '.html')
      const output_path = path.join(output_dir, outputfilename)
      return new Promise((resolve, reject) => {
        fs.writeFile(output_path, result, (err) => {
          if (err) {
            console.error(err)
            reject(err)
          }
          console.log('Generated: ' + outputfilename)
          this.outputFile = new File(output_path)
          resolve(this)
        })
      })
    })
  }
}

try {
  fs.accessSync(public_dir, fs.R_OK | fs.W_OK)
} catch (e) {
  fs.mkdirSync(public_dir)
}

fs.readdir(posts_dir, (err, filenames) => {
  if (err) {
    console.error(err)
    return
  }
  filenames.forEach((filename, index) => {
    if (!filename.endsWith('.adoc')) return
    const post = new Post(path.join(posts_dir, filename))
    post.render()
      // .then(r => console.log(r))
  })
})