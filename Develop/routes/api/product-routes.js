const router = require('express').Router();
const { Product, Category, Tag, ProductTag } = require('../../models');

// The `/api/products` endpoint

// get all products
router.get('/', async (req, res) => {
  try {
    // Find all products and include associated Category and Tag data
    const products = await Product.findAll({
      include: [{ model: Category }, { model: Tag, through: ProductTag }],
    });
    res.json(products);
  } catch (error) {
    res.status(500).json(error);
  }
});

// get one product
router.get('/:id', async (req, res) => {
  try {
    // Find a single product by its `id` and include associated Category and Tag data
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: Category }, { model: Tag, through: ProductTag }],
    });
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    res.json(product);
  } catch (error) {
    res.status(500).json(error);
  }
});

// create new product
router.post('/', async (req, res) => {
  try {
    // Create a new product
    const product = await Product.create(req.body);

    // If there are product tags, create pairings to bulk create in the ProductTag model
    if (req.body.tagIds && req.body.tagIds.length) {
      const productTagIdArr = req.body.tagIds.map((tag_id) => {
        return {
          product_id: product.id,
          tag_id,
        };
      });
      await ProductTag.bulkCreate(productTagIdArr);
    }

    res.status(201).json(product);
  } catch (error) {
    res.status(400).json(error);
  }
});

// update product
router.put('/:id', async (req, res) => {
  try {
    // Update product data
    const [rowsAffected, updatedProduct] = await Product.update(req.body, {
      where: { id: req.params.id },
      returning: true,
    });

    // If there are product tags, update or create pairings in the ProductTag model
    if (req.body.tagIds && req.body.tagIds.length) {
      const productTags = await ProductTag.findAll({ where: { product_id: req.params.id } });
      const currentTagIds = productTags.map((tag) => tag.tag_id);
      const newTagIds = req.body.tagIds.filter((tag_id) => !currentTagIds.includes(tag_id));
      const tagsToRemove = productTags.filter((tag) => !req.body.tagIds.includes(tag.tag_id));

      await Promise.all([
        ProductTag.bulkCreate(newTagIds.map((tag_id) => ({ product_id: req.params.id, tag_id }))),
        ProductTag.destroy({ where: { id: tagsToRemove.map((tag) => tag.id) } }),
      ]);
    }

    if (rowsAffected > 0) {
      res.json(updatedProduct[0]);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(400).json(error);
  }
});

// delete one product by its `id` value
router.delete('/:id', async (req, res) => {
  try {
    const deletedProduct = await Product.destroy({ where: { id: req.params.id } });
    if (deletedProduct) {
      res.json({ message: 'Product deleted successfully' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json(error);
  }
});

module.exports = router;
