import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// material-ui
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Autocomplete from '@mui/material/Autocomplete';
import Switch from '@mui/material/Switch';

// icons
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import TransformIcon from '@mui/icons-material/Transform';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import CircularProgress from '@mui/material/CircularProgress';

import MainCard from 'ui-component/cards/MainCard';
import Pagination from 'components/Pagination';
import SearchableNodeSelect from 'components/SearchableNodeSelect';
import {
  getTemplates,
  addTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplateUsage,
  getACL4SSRPresets,
  convertRules
} from 'api/templates';
import { getBaseTemplates, updateBaseTemplate } from 'api/settings';
import { getNodes } from 'api/nodes';
import { withAlpha } from 'utils/colorUtils';

// Monaco Editor
import Editor from '@monaco-editor/react';

export default function TemplateList() {
  const { t } = useTranslation();
  const theme = useTheme();
  const palette = theme.vars?.palette || theme.palette;
  const isDark = theme.palette.mode === 'dark';
  const matchDownMd = useMediaQuery(theme.breakpoints.down('md'));

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [formData, setFormData] = useState({ filename: '', text: '', category: 'clash', ruleSource: '', enableIncludeAll: false });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [aclPresets, setAclPresets] = useState([]);
  const [converting, setConverting] = useState(false);
  const [editorFullscreen, setEditorFullscreen] = useState(false);
  const [errorDialog, setErrorDialog] = useState({ open: false, title: '', message: '' });
  const [usageDialog, setUsageDialog] = useState({ open: false, title: '', message: '', subscriptions: [], action: null });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const saved = localStorage.getItem('templates_rowsPerPage');
    return saved ? parseInt(saved, 10) : 10;
  });
  const [totalItems, setTotalItems] = useState(0);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmInfo, setConfirmInfo] = useState({
    title: '',
    content: '',
    action: null
  });

  const [baseTemplateDialogOpen, setBaseTemplateDialogOpen] = useState(false);
  const [baseTemplateCategory, setBaseTemplateCategory] = useState('clash');
  const [baseTemplateContent, setBaseTemplateContent] = useState('');
  const [baseTemplateLoading, setBaseTemplateLoading] = useState(false);
  const [baseTemplateSaving, setBaseTemplateSaving] = useState(false);

  const [useProxy, setUseProxy] = useState(false);
  const [proxyLink, setProxyLink] = useState('');
  const [proxyNodeOptions, setProxyNodeOptions] = useState([]);
  const [loadingProxyNodes, setLoadingProxyNodes] = useState(false);

  const openConfirm = (title, content, action) => {
    setConfirmInfo({ title, content, action });
    setConfirmOpen(true);
  };

  const handleConfirmClose = () => {
    setConfirmOpen(false);
  };

  const handleConfirmAction = async () => {
    if (confirmInfo.action) {
      await confirmInfo.action();
    }
    setConfirmOpen(false);
  };

  const fetchTemplates = async (currentPage, currentPageSize) => {
    setLoading(true);
    try {
      const response = await getTemplates({ page: currentPage + 1, pageSize: currentPageSize });
      if (response.data && response.data.items !== undefined) {
        setTemplates(response.data.items || []);
        setTotalItems(response.data.total || 0);
      } else {
        setTemplates(response.data || []);
        setTotalItems((response.data || []).length);
      }
    } catch (error) {
      console.log(error);
      showMessage(error.message || t('templates.messages.loadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchTemplates(page, rowsPerPage);
  };

  useEffect(() => {
    fetchTemplates(0, rowsPerPage);
    getACL4SSRPresets()
      .then((res) => {
        if (res.data) {
          setAclPresets(res.data);
        }
      })
      .catch((err) => console.log('Failed to load preset list:', err));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const showMessage = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleAdd = () => {
    setIsEdit(false);
    setCurrentTemplate(null);
    setFormData({ filename: '', text: '', category: 'clash', ruleSource: '', enableIncludeAll: false });
    setUseProxy(false);
    setProxyLink('');
    setEditorFullscreen(false);
    setDialogOpen(true);
  };

  const handleEdit = (template) => {
    setIsEdit(true);
    setCurrentTemplate(template);
    setEditorFullscreen(false);
    setFormData({
      filename: template.file,
      text: template.text,
      category: template.category || 'clash',
      ruleSource: template.ruleSource || '',
      enableIncludeAll: template.enableIncludeAll || false
    });
    setUseProxy(template.useProxy || false);
    setProxyLink(template.proxyLink || '');
    if (template.useProxy) {
      fetchProxyNodes();
    }
    setDialogOpen(true);
  };

  const handleDelete = async (template) => {
    let usedSubscriptions = [];

    try {
      const response = await getTemplateUsage({ filename: template.file });
      usedSubscriptions = response.data?.subscriptions || [];
    } catch (error) {
      console.log(error);
      showMessage(error.message || t('templates.messages.usageFailed'), 'error');
      return;
    }

    const deleteAction = async () => {
      try {
        await deleteTemplate({ filename: template.file });
        showMessage(t('templates.messages.deleteSuccess'));
        fetchTemplates(page, rowsPerPage);
      } catch (error) {
        console.log(error);
        showMessage(error.message || t('templates.messages.deleteFailed'), 'error');
      }
    };

    if (usedSubscriptions.length > 0) {
      setUsageDialog({
        open: true,
        title: t('templates.usage.title'),
        message: t('templates.usage.message', { name: template.file }),
        subscriptions: usedSubscriptions,
        action: deleteAction
      });
      return;
    }

    openConfirm(t('templates.delete.title'), t('templates.delete.confirm', { name: template.file }), deleteAction);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditorFullscreen(false);
  };

  const handleConvertTemplate = async (expand) => {
    setConverting(true);
    try {
      const res = await convertRules({
        ruleSource: formData.ruleSource,
        category: formData.category,
        expand,
        template: formData.text,
        useProxy: useProxy,
        proxyLink: proxyLink,
        enableIncludeAll: formData.enableIncludeAll
      });
      if (res.code === 200 && res.data && res.data.content) {
        setFormData({ ...formData, text: res.data.content });
        showMessage(expand ? t('templates.messages.convertExpandSuccess') : t('templates.messages.convertSuccess'));
      } else {
        setErrorDialog({
          open: true,
          title: t('templates.messages.convertFailed'),
          message: res.msg || t('templates.messages.convertError')
        });
      }
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.msg || error.message || t('templates.messages.convertFailed');
      setErrorDialog({
        open: true,
        title: t('templates.messages.convertFailed'),
        message: errorMsg
      });
    } finally {
      setConverting(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (isEdit) {
        await updateTemplate({
          oldname: currentTemplate.file,
          filename: formData.filename,
          text: formData.text,
          category: formData.category,
          ruleSource: formData.ruleSource,
          useProxy: useProxy,
          proxyLink: proxyLink,
          enableIncludeAll: formData.enableIncludeAll
        });
        showMessage(t('templates.messages.updateSuccess'));
      } else {
        await addTemplate({
          filename: formData.filename,
          text: formData.text,
          category: formData.category,
          ruleSource: formData.ruleSource,
          useProxy: useProxy,
          proxyLink: proxyLink,
          enableIncludeAll: formData.enableIncludeAll
        });
        showMessage(t('templates.messages.addSuccess'));
      }
      setEditorFullscreen(false);
      setDialogOpen(false);
      fetchTemplates(page, rowsPerPage);
    } catch (error) {
      console.log(error);
      showMessage(error.message || (isEdit ? t('templates.messages.updateFailed') : t('templates.messages.addFailed')), 'error');
    }
  };

  const handleOpenBaseTemplate = async (category) => {
    setBaseTemplateCategory(category);
    setBaseTemplateDialogOpen(true);
    setBaseTemplateLoading(true);
    try {
      const res = await getBaseTemplates();
      if (res.data) {
        const content = category === 'clash' ? res.data.clashTemplate : res.data.surgeTemplate;
        setBaseTemplateContent(content || '');
      }
    } catch (error) {
      console.error(error);
      showMessage(error.message || t('templates.messages.baseTemplateLoadFailed'), 'error');
    } finally {
      setBaseTemplateLoading(false);
    }
  };

  const handleSaveBaseTemplate = async () => {
    setBaseTemplateSaving(true);
    try {
      await updateBaseTemplate(baseTemplateCategory, baseTemplateContent);
      showMessage(t('templates.messages.baseTemplateSaveSuccess', { category: baseTemplateCategory === 'clash' ? 'Clash' : 'Surge' }));
      setBaseTemplateDialogOpen(false);
    } catch (error) {
      console.error(error);
      showMessage(error.message || t('templates.messages.baseTemplateSaveFailed'), 'error');
    } finally {
      setBaseTemplateSaving(false);
    }
  };

  const fetchProxyNodes = async () => {
    setLoadingProxyNodes(true);
    try {
      const res = await getNodes({ pageSize: 100 });
      if (res.data) {
        const items = res.data.items || res.data || [];
        setProxyNodeOptions(items);
      }
    } catch (error) {
      console.error('Failed to load proxy nodes:', error);
    } finally {
      setLoadingProxyNodes(false);
    }
  };

  const outlinedLabelFixSx = {
    '& .MuiInputLabel-shrink': {
      px: 0.5,
      backgroundColor: 'background.paper',
      lineHeight: 1.35,
      transform: 'translate(14px, -4px) scale(0.75)'
    }
  };

  const configureTemplateMonacoTheme = (monaco) => {
    monaco.editor.defineTheme('template-editor', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.rangeHighlightBackground': '#00000000'
      }
    });
  };

  const renderTemplateEditor = ({ fullscreen = false } = {}) => (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        minHeight: fullscreen ? 0 : 350,
        flex: fullscreen ? 1 : '0 0 auto',
        ...(fullscreen
          ? {
              height: '100%',
              borderRadius: 1,
              overflow: 'hidden'
            }
          : null)
      }}
    >
      {converting && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            borderRadius: 1
          }}
        >
          <Stack alignItems="center" spacing={1}>
            <CircularProgress />
            <Typography color="white">{t('templates.messages.converting')}</Typography>
          </Stack>
        </Box>
      )}
      <Editor
        height={fullscreen ? '100%' : '350px'}
        language={formData.category === 'surge' ? 'ini' : 'yaml'}
        value={formData.text}
        onChange={(value) => {
          setFormData({ ...formData, text: value || '' });
        }}
        theme="template-editor"
        beforeMount={configureTemplateMonacoTheme}
        options={{
          minimap: { enabled: !matchDownMd },
          fontSize: matchDownMd ? 12 : 14,
          readOnly: converting,
          wordWrap: 'on',
          contextmenu: true,
          selectOnLineNumbers: true,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          lineNumbers: matchDownMd ? 'off' : 'on'
        }}
      />
    </Box>
  );

  const getCategoryChipSx = (category) => {
    const semanticColor = category === 'surge' ? palette.secondary : palette.primary;

    return {
      bgcolor: withAlpha(semanticColor.main, isDark ? 0.12 : 0.08),
      color: isDark ? semanticColor.main : semanticColor.dark,
      borderColor: withAlpha(semanticColor.main, isDark ? 0.28 : 0.22),
      borderWidth: 1,
      borderStyle: 'solid',
      fontWeight: 600
    };
  };

  return (
    <MainCard
      title={t('templates.title')}
      secondary={
        matchDownMd ? (
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleAdd}>
            {t('common.add')}
          </Button>
        ) : (
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" size="small" onClick={() => handleOpenBaseTemplate('clash')}>
              {t('templates.baseTemplate.button', { category: 'Clash' })}
            </Button>
            <Button variant="outlined" size="small" color="secondary" onClick={() => handleOpenBaseTemplate('surge')}>
              {t('templates.baseTemplate.button', { category: 'Surge' })}
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
              {t('templates.actions.addTemplate')}
            </Button>
            <IconButton onClick={handleRefresh} disabled={loading}>
              <RefreshIcon
                sx={
                  loading
                    ? {
                        animation: 'spin 1s linear infinite',
                        '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } }
                      }
                    : {}
                }
              />
            </IconButton>
          </Stack>
        )
      }
    >
      {matchDownMd && (
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
          <IconButton onClick={handleRefresh} disabled={loading} size="small">
            <RefreshIcon
              sx={
                loading
                  ? {
                      animation: 'spin 1s linear infinite',
                      '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } }
                    }
                  : {}
              }
            />
          </IconButton>
        </Stack>
      )}

      {matchDownMd ? (
        <Stack spacing={2}>
          {templates.map((template) => (
            <MainCard key={template.file} content={false} border shadow={theme.shadows[1]}>
              <Box p={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Chip label={template.file} color="success" variant="outlined" />
                  <Typography variant="caption" color="textSecondary">
                    {template.create_date || '-'}
                  </Typography>
                </Stack>

                <Divider sx={{ my: 1 }} />

                <Stack direction="row" justifyContent="flex-end" spacing={1}>
                  <IconButton size="small" onClick={() => handleEdit(template)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(template)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Box>
            </MainCard>
          ))}
        </Stack>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('templates.fields.filename')}</TableCell>
                <TableCell>{t('templates.fields.category')}</TableCell>
                <TableCell>{t('templates.fields.ruleSource')}</TableCell>
                <TableCell>{t('templates.fields.createdAt')}</TableCell>
                <TableCell align="right">{t('templates.fields.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.file} hover>
                  <TableCell>
                    <Chip label={template.file} color="success" variant="outlined" size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={template.category === 'surge' ? 'Surge' : 'Clash'}
                      size="small"
                      sx={getCategoryChipSx(template.category)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {template.ruleSource || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>{template.create_date || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleEdit(template)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(template)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Pagination
        page={page}
        pageSize={rowsPerPage}
        totalItems={totalItems}
        onPageChange={(_, newPage) => {
          setPage(newPage);
          fetchTemplates(newPage, rowsPerPage);
        }}
        onPageSizeChange={(e) => {
          const newValue = parseInt(e.target.value, 10);
          setRowsPerPage(newValue);
          localStorage.setItem('templates_rowsPerPage', newValue);
          setPage(0);
          fetchTemplates(0, newValue);
        }}
        pageSizeOptions={[10, 20, 50, 100]}
      />

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth={editorFullscreen ? false : 'lg'}
        fullWidth
        fullScreen={editorFullscreen}
        PaperProps={{
          sx: editorFullscreen
            ? {
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                height: '100vh',
                maxHeight: '100vh',
                m: 0
              }
            : undefined
        }}
      >
        <DialogTitle
          sx={
            editorFullscreen
              ? {
                  flexShrink: 0,
                  pb: 1,
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  alignItems: { xs: 'stretch', md: 'center' },
                  justifyContent: 'space-between',
                  gap: 1.5
                }
              : undefined
          }
        >
          <Stack spacing={0.5}>
            <Typography variant="h4">{isEdit ? t('templates.dialog.editTitle') : t('templates.dialog.addTitle')}</Typography>
          </Stack>
          {editorFullscreen && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="flex-end" alignItems="center">
              <Button variant="outlined" size="small" startIcon={<FullscreenExitIcon />} onClick={() => setEditorFullscreen(false)}>
                {t('templates.actions.exitFullscreen')}
              </Button>
            </Stack>
          )}
        </DialogTitle>
        <DialogContent
          sx={
            editorFullscreen
              ? {
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  minHeight: 0,
                  overflow: 'hidden',
                  overflowX: 'hidden',
                  pt: 1,
                  pb: 1.5
                }
              : undefined
          }
        >
          <Stack
            spacing={1.5}
            sx={
              editorFullscreen
                ? {
                    flex: 1,
                    minHeight: 0
                  }
                : { mt: 0.5 }
            }
          >
            {!editorFullscreen && (
              <>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    fullWidth
                    label={t('templates.fields.filename')}
                    value={formData.filename}
                    onChange={(e) => setFormData({ ...formData, filename: e.target.value })}
                    placeholder={t('templates.placeholders.filename')}
                    sx={outlinedLabelFixSx}
                  />
                  <FormControl sx={{ minWidth: 120, ...outlinedLabelFixSx }}>
                    <InputLabel>{t('templates.fields.category')}</InputLabel>
                    <Select
                      value={formData.category}
                      label={t('templates.fields.category')}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <MenuItem value="clash">Clash</MenuItem>
                      <MenuItem value="surge">Surge</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
                <Autocomplete
                  freeSolo
                  options={aclPresets}
                  sx={outlinedLabelFixSx}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option;
                    return option.label || option.url || '';
                  }}
                  isOptionEqualToValue={(option, value) => {
                    if (typeof value === 'string') {
                      return option.url === value;
                    }
                    return option.url === value?.url;
                  }}
                  value={aclPresets.find((preset) => preset.url === formData.ruleSource) || formData.ruleSource}
                  onChange={(_, newValue) => {
                    if (typeof newValue === 'string') {
                      setFormData({ ...formData, ruleSource: newValue });
                    } else if (newValue && newValue.url) {
                      setFormData({ ...formData, ruleSource: newValue.url });
                    } else {
                      setFormData({ ...formData, ruleSource: '' });
                    }
                  }}
                  onInputChange={(_, newInputValue) => {
                    setFormData({ ...formData, ruleSource: newInputValue });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('templates.fields.remoteRuleSource')}
                      placeholder={t('templates.placeholders.ruleSource')}
                      helperText={t('templates.helpers.ruleSource')}
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props} key={option.name}>
                      <Stack>
                        <Typography variant="body2">{option.label}</Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                          {option.url}
                        </Typography>
                      </Stack>
                    </li>
                  )}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={useProxy}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setUseProxy(checked);
                        if (checked) {
                          fetchProxyNodes();
                        }
                      }}
                    />
                  }
                  label={t('templates.fields.useProxy')}
                />
                {useProxy && (
                  <Box>
                    <SearchableNodeSelect
                      nodes={proxyNodeOptions}
                      loading={loadingProxyNodes}
                      value={
                        proxyNodeOptions.find((n) => n.Link === proxyLink) || (proxyLink ? { Link: proxyLink, Name: '', ID: 0 } : null)
                      }
                      onChange={(newValue) => setProxyLink(typeof newValue === 'string' ? newValue : newValue?.Link || '')}
                      displayField="Name"
                      valueField="Link"
                      label={t('templates.fields.proxyNode')}
                      placeholder={t('templates.placeholders.proxyNode')}
                      helperText={t('templates.helpers.proxyNode')}
                      freeSolo={true}
                      limit={50}
                    />
                  </Box>
                )}
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.enableIncludeAll}
                      onChange={(e) => setFormData({ ...formData, enableIncludeAll: e.target.checked })}
                    />
                  }
                  label={t('templates.fields.includeAll')}
                />
                <Typography variant="caption" color="textSecondary" component="div" sx={{ ml: 6, mt: -0.5, lineHeight: 1.6 }}>
                  {t('templates.helpers.includeAllOn')}
                </Typography>
                <Typography variant="caption" color="textSecondary" component="div" sx={{ ml: 6, lineHeight: 1.6 }}>
                  {t('templates.helpers.includeAllOff')}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    startIcon={converting ? <CircularProgress size={18} /> : <TransformIcon />}
                    disabled={!formData.ruleSource || converting}
                    onClick={() => handleConvertTemplate(false)}
                  >
                    {t('templates.actions.convertRules')}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={converting ? <CircularProgress size={18} /> : <UnfoldMoreIcon />}
                    disabled={!formData.ruleSource || converting}
                    onClick={() => handleConvertTemplate(true)}
                  >
                    {t('templates.actions.convertRulesExpand')}
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    disabled={!formData.text || converting}
                    onClick={() => {
                      openConfirm(t('templates.confirm.clearTitle'), t('templates.confirm.clearContent'), () => {
                        setFormData({ ...formData, text: '' });
                        showMessage(t('templates.messages.cleared'));
                      });
                    }}
                  >
                    {t('templates.actions.clearContent')}
                  </Button>
                </Stack>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={editorFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                    onClick={() => setEditorFullscreen((prev) => !prev)}
                    sx={{ flexShrink: 0 }}
                  >
                    {editorFullscreen ? t('templates.actions.exitFullscreen') : t('templates.actions.fullscreen')}
                  </Button>
                </Box>
              </>
            )}
            <Box
              sx={
                editorFullscreen
                  ? {
                      flex: 1,
                      minHeight: 0,
                      display: 'flex',
                      flexDirection: 'column'
                    }
                  : undefined
              }
            >
              {renderTemplateEditor({ fullscreen: editorFullscreen })}
            </Box>
          </Stack>
        </DialogContent>
        {!editorFullscreen && (
          <DialogActions>
            <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
            <Button variant="contained" onClick={handleSubmit}>
              {t('common.confirm')}
            </Button>
          </DialogActions>
        )}
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>

      <Dialog
        open={confirmOpen}
        onClose={handleConfirmClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{confirmInfo.title}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description" sx={{ color: 'text.primary' }}>
            {confirmInfo.content}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmClose}>{t('common.cancel')}</Button>
          <Button onClick={handleConfirmAction} variant="contained" color="error" autoFocus>
            {t('common.confirm')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={errorDialog.open}
        onClose={() => setErrorDialog({ ...errorDialog, open: false })}
        aria-labelledby="error-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="error-dialog-title" sx={{ color: 'error.main' }}>
          ⚠️ {errorDialog.title}
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mt: 1 }}>
            {errorDialog.message}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setErrorDialog({ ...errorDialog, open: false })} autoFocus>
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={usageDialog.open}
        onClose={() => setUsageDialog({ ...usageDialog, open: false })}
        aria-labelledby="template-usage-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="template-usage-dialog-title">⚠️ {usageDialog.title}</DialogTitle>
        <DialogContent>
          <Alert
            severity="warning"
            variant="outlined"
            sx={{
              mt: 1,
              alignItems: 'flex-start',
              backgroundColor: alpha(theme.palette.warning.main, 0.08),
              borderColor: alpha(theme.palette.warning.main, 0.28),
              color: 'text.primary',
              '& .MuiAlert-icon': {
                color: 'warning.dark',
                mt: '2px'
              },
              '& .MuiAlert-message': {
                width: '100%'
              }
            }}
          >
            {usageDialog.message}
          </Alert>
          {usageDialog.subscriptions?.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t('templates.usage.usedSubscriptions')}
              </Typography>
              <Stack spacing={1}>
                {usageDialog.subscriptions.map((subscriptionName) => (
                  <Chip key={subscriptionName} label={subscriptionName} color="warning" variant="outlined" sx={{ width: 'fit-content' }} />
                ))}
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUsageDialog({ ...usageDialog, open: false, subscriptions: [], action: null })}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              const action = usageDialog.action;
              setUsageDialog({ open: false, title: '', message: '', subscriptions: [], action: null });
              if (action) {
                await action();
              }
            }}
            autoFocus
          >
            {t('templates.actions.continueDelete')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={baseTemplateDialogOpen} onClose={() => setBaseTemplateDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>{t('templates.baseTemplate.title', { category: baseTemplateCategory === 'clash' ? 'Clash' : 'Surge' })}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            {t('templates.baseTemplate.description')}
          </Typography>
          {baseTemplateLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Editor
              height="400px"
              language={baseTemplateCategory === 'surge' ? 'ini' : 'yaml'}
              value={baseTemplateContent}
              onChange={(value) => setBaseTemplateContent(value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: !matchDownMd },
                fontSize: matchDownMd ? 12 : 14,
                readOnly: baseTemplateSaving,
                wordWrap: 'on',
                contextmenu: true,
                selectOnLineNumbers: true,
                automaticLayout: true,
                scrollBeyondLastLine: false,
                lineNumbers: matchDownMd ? 'off' : 'on'
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBaseTemplateDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            onClick={handleSaveBaseTemplate}
            disabled={baseTemplateLoading || baseTemplateSaving}
            startIcon={baseTemplateSaving ? <CircularProgress size={18} /> : null}
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </MainCard>
  );
}
