import express from 'express';
import { portraits } from '../models/index.js';

const router = express.Router();

router.get('/ceo/:name', async (req, res) => {
  try {
    const ceo = await portraits.getCeoByName(decodeURIComponent(req.params.name));

    if (!ceo) {
      return res.status(404).json({
        success: false,
        error: { message: 'CEO not found' }
      });
    }

    res.json({
      success: true,
      data: {
        name: ceo.name,
        company: ceo.company,
        portrait: ceo.ai_portrait_url || null,
        fallback: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(ceo.name)}`
      }
    });
  } catch (error) {
    console.error('Error fetching CEO portrait:', error.message);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch CEO portrait' }
    });
  }
});

router.get('/official/:name', async (req, res) => {
  try {
    const official = await portraits.getOfficialByName(decodeURIComponent(req.params.name));

    if (!official) {
      return res.status(404).json({
        success: false,
        error: { message: 'Official not found' }
      });
    }

    res.json({
      success: true,
      data: {
        name: official.name,
        title: official.title,
        state: official.state,
        party: official.party,
        portrait: official.ai_portrait_url || null,
        fallback: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(official.name)}`
      }
    });
  } catch (error) {
    console.error('Error fetching official portrait:', error.message);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch official portrait' }
    });
  }
});

router.get('/ceos', async (req, res) => {
  try {
    const ceos = await portraits.getAllCeos();
    res.json({
      success: true,
      data: ceos.map(ceo => ({
        name: ceo.name,
        company: ceo.company,
        portrait: ceo.ai_portrait_url || null,
        fallback: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(ceo.name)}`
      }))
    });
  } catch (error) {
    console.error('Error fetching CEOs:', error.message);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch CEOs' }
    });
  }
});

router.get('/officials', async (req, res) => {
  try {
    const officials = await portraits.getAllOfficials();
    res.json({
      success: true,
      data: officials.map(official => ({
        name: official.name,
        title: official.title,
        state: official.state,
        party: official.party,
        portrait: official.ai_portrait_url || null,
        fallback: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(official.name)}`
      }))
    });
  } catch (error) {
    console.error('Error fetching officials:', error.message);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch officials' }
    });
  }
});

export default router;
