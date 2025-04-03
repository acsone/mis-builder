# Copyright 2025 ACSONE SA/NV
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).

from odoo import api, fields, models


class MisReportInstanceAnnotation(models.Model):
    _name = "mis.report.instance.annotation"
    _description = "Mis Report Instance Annotation"  # TODO

    period_id = fields.Many2one(
        comodel_name="mis.report.instance.period",
    )
    kpi_id = fields.Many2one(
        comodel_name="mis.report.kpi",
    )
    subkpi_id = fields.Many2one(
        comodel_name="mis.report.subkpi",
    )
    note = fields.Char()

    @api.model
    def edit_annotation(self, period_id, kpi_id, subkpi_id, note):
        annotation = self.env["mis.report.instance.annotation"].search(
            [
                ("period_id", "=", period_id),
                ("kpi_id", "=", kpi_id),
                ("subkpi_id", "=", subkpi_id),
            ],
            limit=1,
        )

        if annotation:
            annotation.note = note
        else:
            self.env["mis.report.instance.annotation"].create(
                {
                    "period_id": period_id,
                    "kpi_id": kpi_id,
                    "subkpi_id": subkpi_id,
                    "note": note,
                }
            )

    @api.model
    def remove_annotation(self, period_id, kpi_id, subkpi_id):
        annotation = self.env["mis.report.instance.annotation"].search(
            [
                ("period_id", "=", period_id),
                ("kpi_id", "=", kpi_id),
                ("subkpi_id", "=", subkpi_id),
            ],
            limit=1,
        )
        if annotation:
            annotation.unlink()
